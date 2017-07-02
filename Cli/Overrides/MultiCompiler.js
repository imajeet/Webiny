/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";

const Tapable = require("tapable");
const asyncLib = require("async");
const MultiWatching = require("./MultiWatching");
const MultiStats = require("webpack/lib/MultiStats");

module.exports = class MultiCompiler extends Tapable {
    constructor(compilers) {
        super();
        if (!Array.isArray(compilers)) {
            compilers = Object.keys(compilers).map((name) => {
                compilers[name].name = name;
                return compilers[name];
            });
        }
        this.compilers = compilers;
        let doneCompilers = 0;
        let compilerStats = [];
        this.compilers.forEach((compiler, idx) => {
            let compilerDone = false;
            compiler.plugin("done", stats => {
                if (!compilerDone) {
                    compilerDone = true;
                    doneCompilers++;
                }
                compilerStats[idx] = stats;
                if (doneCompilers === this.compilers.length) {
                    this.applyPlugins("done", new MultiStats(compilerStats));
                }
            });
            compiler.plugin("invalid", () => {
                if (compilerDone) {
                    compilerDone = false;
                    doneCompilers--;
                }
                this.applyPlugins("invalid");
            });
        }, this);
    }

    get outputPath() {
        let commonPath = this.compilers[0].outputPath;
        for (const compiler of this.compilers) {
            while (compiler.outputPath.indexOf(commonPath) !== 0 && /[\/\\]/.test(commonPath)) {
                commonPath = commonPath.replace(/[\/\\][^\/\\]*$/, "");
            }
        }

        if (!commonPath && this.compilers[0].outputPath[0] === "/") return "/";
        return commonPath;
    }

    get inputFileSystem() {
        throw new Error("Cannot read inputFileSystem of a MultiCompiler");
    }

    get outputFileSystem() {
        throw new Error("Cannot read outputFileSystem of a MultiCompiler");
    }

    set inputFileSystem(value) {
        this.compilers.forEach(compiler => {
            compiler.inputFileSystem = value;
        });
    }

    set outputFileSystem(value) {
        this.compilers.forEach(compiler => {
            compiler.outputFileSystem = value;
        });
    }

    runWithDependencies(compilers, fn, callback) {
        let fulfilledNames = {};
        let remainingCompilers = compilers;
        const isDependencyFulfilled = (d) => fulfilledNames[d];
        const getReadyCompilers = () => {
            let readyCompilers = [];
            let list = remainingCompilers;
            remainingCompilers = [];
            for (const c of list) {
                const ready = !c.dependencies || c.dependencies.every(isDependencyFulfilled);
                if (ready)
                    readyCompilers.push(c);
                else
                    remainingCompilers.push(c);
            }
            return readyCompilers;
        };
        const runCompilers = (callback) => {
            if (remainingCompilers.length === 0) return callback();
            asyncLib.map(getReadyCompilers(), (compiler, callback) => {
                fn(compiler, (err) => {
                    if (err) return callback(err);
                    fulfilledNames[compiler.name] = true;
                    runCompilers(callback);
                });
            }, callback);
        };
        runCompilers(callback);
    }

    watch(watchOptions, handler) {
        let allStats = this.compilers.map(() => null);
        let compilerStatus = this.compilers.map(() => false);
        let chainedWatching = Promise.resolve([]);
        this.runWithDependencies(this.compilers, (compiler, callback) => {
            const compilerIdx = this.compilers.indexOf(compiler);
            let firstRun = true;

            chainedWatching = chainedWatching.then(watchings => {
                return new Promise(resolve => {
                    const watching = compiler.watch(Array.isArray(watchOptions) ? watchOptions[compilerIdx] : watchOptions, (err, stats) => {
                        if (err)
                            handler(err);
                        if (stats) {
                            allStats[compilerIdx] = stats;
                            compilerStatus[compilerIdx] = "new";
                            if (compilerStatus.every(Boolean)) {
                                const freshStats = allStats.filter((s, idx) => {
                                    return compilerStatus[idx] === "new";
                                });
                                compilerStatus.fill(true);
                                const multiStats = new MultiStats(freshStats);
                                handler(null, multiStats);
                            }
                        }
                        if (firstRun && !err) {
                            firstRun = false;
                            callback();
                        }
                        watchings.push(watching);
                        resolve(watchings);
                    });
                });
            });
        }, () => {
            // ignore
        });

        return new MultiWatching(chainedWatching, this);
    }

    run(callback) {
        let chainedBuild = Promise.resolve();
        const allStats = this.compilers.map(() => null);
        this.runWithDependencies(this.compilers, ((compiler, callback) => {
            chainedBuild = chainedBuild.then(() => {
                return new Promise(resolve => {
                    const compilerIdx = this.compilers.indexOf(compiler);
                    compiler.run((err, stats) => {
                        if (err) {
                            callback(err);
                        } else {
                            allStats[compilerIdx] = stats;
                            callback();
                        }
                        resolve();
                    });
                });
            });
        }), (err) => {
            if (err) return callback(err);
            callback(null, new MultiStats(allStats));
        });
    }

    purgeInputFileSystem() {
        this.compilers.forEach((compiler) => {
            if (compiler.inputFileSystem && compiler.inputFileSystem.purge)
                compiler.inputFileSystem.purge();
        });
    }
};
<?php
/**
 * Webiny Platform (http://www.webiny.com/)
 *
 * @copyright Copyright Webiny LTD
 */

namespace Apps\Core\Php\PackageManager;

use Apps\Core\Php\DevTools\Exceptions\AppException;
use Apps\Core\Php\DevTools\LifeCycle\LifeCycleInterface;
use Webiny\Component\Config\ConfigObject;
use Webiny\Component\Storage\Directory\Directory;
use Webiny\Component\Storage\File\File;

/**
 * Class that holds information about an application.
 */
class App extends AbstractPackage
{
    use ParsersTrait;

    /**
     * Application base constructor.
     *
     * @param ConfigObject $info Application information object.
     * @param string       $path Absolute path to the application.
     * @param string       $type
     *
     * @throws \Exception
     */
    public function __construct(ConfigObject $info, $path, $type = 'app')
    {
        parent::__construct($info, $path, $type);

        $this->name = $info->get('Name', '');
        $this->version = $info->get('Version', '');

        if ($this->name == '' || $this->version == '') {
            throw new \Exception('A component must have both name and version properties defined');
        }

        $this->registerAutoloaderMap();
        $this->parseNamespace($path);
        $this->parseEvents($info);
        $this->parseStorages($info);
        $this->parseServices($info);
        $this->parseRoutes($info);
    }

    public function getVersion()
    {
        return $this->version;
    }

    public function getVersionPath()
    {
        $version = $this->wConfig()->get('Apps.' . $this->name);
        if ($version && !is_bool($version)) {
            $version = '/v' . str_replace('.', '_', $version);
        } else {
            $version = '';
        }

        return $version;
    }

    public function getPath($absolute = true)
    {
        $version = $this->getVersionPath();
        if ($absolute) {
            return $this->wConfig()->get('Application.AbsolutePath') . 'Apps/' . $this->name . $version;
        }

        return 'Apps/' . $this->name . $version;
    }

    public function getBuildPath()
    {
        $env = $this->wIsProduction() ? 'production' : 'development';

        return '/build/' . $env . '/' . $this->name . $this->getVersionPath();
    }

    public function getBuildMeta($jsApp = null)
    {
        if ($this->wIsProduction()) {
            $storage = $this->wStorage('ProductionBuild');
        } else {
            $storage = $this->wStorage('DevBuild');
        }

        $filter = $jsApp ? $this->name . '_' . $jsApp . '\/meta\.json' : $this->name . '_\S+\/meta\.json';
        $files = new Directory('', $storage, 1, '/' . $filter . '/');
        $jsAppsMeta = [];
        /* @var $file File */
        foreach ($files as $file) {
            $data = json_decode($file->getContents(), true);
            if ($jsApp && $this->getName() . '.' . $jsApp === $data['name']) {
                return $data;
            }
            $jsAppsMeta[] = $data;
        }

        if ($jsApp) {
            throw new AppException('App "' . $this->getName() . '.' . $jsApp . '" was not found!', 'WBY-APP_NOT_FOUND');
        }

        return $jsAppsMeta;
    }

    /**
     * Get asset URL
     *
     * @param string $app JS app name
     * @param string $asset Asset path
     *
     * @return string
     */
    public function getAsset($app, $asset)
    {
        return $this->wConfig()->get('Application.WebPath') . $this->getBuildPath() . '/' . $app . '/' . $asset;
    }

    public function getEntities()
    {
        $version = $this->getVersionPath();
        $entitiesDir = $this->getName() . $version . '/Php/Entities';
        $dir = new Directory($entitiesDir, $this->wStorage('Apps'), false, '*.php');
        $entities = [];
        /* @var $file \Webiny\Component\Storage\File\File */
        foreach ($dir as $file) {
            $entityClass = 'Apps\\' . $this->str($file->getKey())->replace(['.php', $version], '')->replace('/', '\\')->val();
            $entityName = $this->str($file->getKey())->explode('/')->last()->replace('.php', '')->val();

            // Check if abstract or trait
            $cls = new \ReflectionClass($entityClass);
            if (!$cls->isAbstract() && !$cls->isTrait()) {
                $entities[$entityName] = [
                    'app'   => $this->getName(),
                    'name'  => $this->getName() . '.' . $entityName,
                    'class' => $entityClass,
                ];
            }
        }

        return $entities;
    }

    public function getServices()
    {
        $version = $this->getVersionPath();
        $servicesDir = $this->getName() . $version . '/Php/Services';
        $dir = new Directory($servicesDir, $this->wStorage('Apps'), false, '*.php');
        $services = [];
        /* @var $file \Webiny\Component\Storage\File\File */
        foreach ($dir as $file) {
            $serviceClass = 'Apps\\' . $this->str($file->getKey())->replace(['.php', $version], '')->replace('/', '\\')->val();
            $serviceName = $this->str($file->getKey())->explode('/')->last()->replace('.php', '')->val();
            // Check if abstract
            $cls = new \ReflectionClass($serviceClass);
            if (!$cls->isAbstract()) {
                $interfaces = class_implements($serviceClass);
                $public = in_array('Apps\Core\Php\DevTools\Interfaces\PublicApiInterface', $interfaces);
                $authorization = !in_array('Apps\Core\Php\DevTools\Interfaces\NoAuthorizationInterface', $interfaces);

                $services[$serviceName] = [
                    'app'           => $this->getName(),
                    'name'          => $serviceName,
                    'class'         => $serviceClass,
                    'public'        => $public,
                    'authorization' => $public ? false : $authorization
                ];
            }
        }

        return $services;
    }

    /**
     * Get instance of a lifecycle object: Bootstrap, Install or Release
     *
     * @param string $name Life cycle object name
     *
     * @return LifeCycleInterface
     */
    public function getLifeCycleObject($name)
    {
        $builtInClass = 'Apps\Core\Php\DevTools\LifeCycle\\' . $name;
        if (file_exists($this->getPath(true) . '/Php/' . $name . '.php')) {
            $class = 'Apps\\' . $this->getName() . '\\Php\\' . $name;
            if (in_array($builtInClass, class_parents($class))) {
                return new $class;
            }
        }

        return new $builtInClass();
    }

    private function registerAutoloaderMap()
    {
        $this->wClassLoader()->appendLibrary('Apps\\' . $this->name . '\\', $this->getPath());
    }
}
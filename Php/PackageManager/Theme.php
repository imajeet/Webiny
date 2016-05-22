<?php
/**
 * Webiny Platform (http://www.webiny.com/)
 *
 * @copyright Copyright Webiny LTD
 * @license   http://www.webiny.com/platform/license
 */

namespace Apps\Core\Php\PackageManager;

use Webiny\Component\Config\ConfigObject;

/**
 * Description
 */
class Theme extends PackageAbstract
{
    use ParsersTrait;

    /**
     * Base theme constructor.
     *
     * @param ConfigObject $info
     * @param string       $path
     */
    public function __construct(ConfigObject $info, $path)
    {
        parent::__construct($info, $path, "theme");

        $this->parseNamespace($path);
        $this->parseEvents($info);
        $this->parseRoutes($info);
    }

}
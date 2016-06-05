<?php
/**
 * Webiny Platform (http://www.webiny.com/)
 *
 * @copyright Copyright Webiny LTD
 */

namespace Apps\Core\Php\Dispatchers;

use Apps\Core\Php\DevTools\Response\ApiErrorResponse;
use Apps\Core\Php\DevTools\Response\ApiResponse;
use Apps\Core\Php\RequestHandlers\ApiEvent;

/**
 * Class EntityDispatcher
 * @package Apps\Core\Php\Dispatchers
 */
class EntityDispatcher extends AbstractApiDispatcher
{
    protected $flowClass = '\Apps\Core\Php\Dispatchers\AbstractFlow';

    public function handle(ApiEvent $event)
    {
        if (!$event->getUrl()->startsWith('/entities')) {
            return false;
        }

        $result = null;
        $request = $this->parseUrl($event->getUrl()->replace('/entities', ''));

        $httpMethod = $this->wRequest()->getRequestMethod();
        $params = $request['params'];

        $entityClass = '\\Apps\\' . $request['app'] . '\\Php\\Entities\\' . $this->str($request['class'])->singularize();
        if (!class_exists($entityClass)) {
            return new ApiErrorResponse([], 'Entity class ' . $entityClass . ' does not exist!');
        }

        $flows = $this->wService()->getServicesByTag('entity-dispatcher-flow');

        usort($flows, function ($flow1, $flow2) {
            /* @var AbstractFlow $flow1 */
            /* @var AbstractFlow $flow2 */
            return $flow1->getPriority() <=> $flow2->getPriority();
        });

        /* @var $flow AbstractFlow */
        foreach ($flows as $flow) {
            if ($this->isInstanceOf($flow, $this->flowClass) && $flow->canHandle($httpMethod, $params)) {
                return new ApiResponse($flow->handle(new $entityClass(), $params));
            }
        }

        return null;
    }
}
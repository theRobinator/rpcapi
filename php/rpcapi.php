<?php

class RPCAPI {

    public function __construct() {
        $this->rpcs = array();
    }

    /**
     * Add a function to the API.
     * @param string $name
     * @param function|string $func
     */
    public function addFunction($name, $func) {
        if (!isset($func)) {
            $retro = new ReflectionFunction($name);
            $func = $name;
        } else {
            $retro = new ReflectionFunction($func);
        }
        $minArgs = 0;
        $maxArgs = 0;
        foreach ($retro->getParameters() as $param) {
            $maxArgs++;
            if (!$param->isOptional()) {
                $minArgs++;
            }
        }
        $this->rpcs[$name] = array(
            'func' => $func,
            'minArgs' => $minArgs,
            'maxArgs' => $maxArgs
        );
    }

    /**
     * Respond to a request that was made to the current script.
     * @return boolean Success
     */
    public function respondToRequest() {
        // Get the name of the RPC
        if (!isset($_GET['rpc'])) {
            $this->returnError('Missing RPC name');
            return false;
        }
        $rpcName = preg_replace('/[^-a-zA-Z0-9_]/', '', $_GET['rpc']);

        if (!$this->hasRPC($rpcName)) {
            echo $this->returnError('RPC does not exist');
            return false;
        }

        // Parse parameters from POST
        $params = array();
        $paramIndex = 0;
        while (isset($_POST['arg' . $paramIndex])) {
            $thisParam = $_POST['arg' . $paramIndex];
            $params[] = json_decode($thisParam, true);
            $paramIndex++;
        }

        // Call the appropriate function
        $result = $this->callRPC($rpcName, $params);
        echo $result;

        return true;
    }

    /**
     * Call an RPC that has been declared.
     */
    public function callRPC($name, $args=array()) {
        $rpcInfo = $this->rpcs[$name];
        $func = $rpcInfo['func'];

        $args = array_slice(func_get_args(), 1);
        $args = $args[0];
        $count = count($args);
        if ($count < $rpcInfo['minArgs']) {
            return $this->returnError('Not enough arguments specified');
        } elseif ($count > $rpcInfo['maxArgs']) {
            return $this->returnError('Too many arguments specified');
        }

        $result = call_user_func_array($func, $args);
        return sprintf('{"response": {"type": "success", "result": %s}}', json_encode($result));
    }

    /**
     * Check if the named RPC has been declared.
     */
    public function hasRPC($name) {
        return isset($this->rpcs[$name]);
    }

    /**
     * Sanitize a parameter value for use.
     */
    private function sanitizeParam($value) {
        return preg_replace('/[^-a-zA-Z0-9_]/', '', $value);
    }

    private function returnError($reason) {
        return sprintf('{"response": {"type": "error", "reason": %s}}', json_encode($reason));
    }
}

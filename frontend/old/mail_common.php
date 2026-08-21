<?php

class mail_common{
  private $to = "mail@irimo.cc";
  private $from = "from_passapple@irimo.cc";
  public function send($sbj = "from mail form"){
    $header = "From:".$this->from;
    $header .= "\r\nContent-Type: text/plain;";
    $contents = $this->getRequest();
    $ret = @mail($this->to, $sbj, $contents, $header);
  }
  private function getRequest(){
    ob_start();
    var_dump($_REQUEST);
    print("- - - - - - - - - - -\n");
    var_dump($_ENV);
//    var_dump("REMOTE_HOST=".$_ENV["REMOTE_HOST"]);
    $ret = ob_get_contents();
    return $ret;
  }
}
$mail = new mail_common();
$mail->send("合格林檎からこんにちは");

header("Location: /passapple/thanks.html");
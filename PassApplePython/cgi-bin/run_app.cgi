#!/usr/bin/perl
use strict;
use warnings;

# この行以降、PerlプロセスはPythonプロセスに上書きされます
exec("python -m  flask --app app run") or die "起動に失敗しました: $!";


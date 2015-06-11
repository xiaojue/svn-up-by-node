var $url = require('url');
var $fs = require('fs');
var $path = require('path');
var $querystring = require('querystring');
var $domain = require('domain');
var $child_process = require('child_process');
var $http = require('http');

$http.createServer(function(req, res) {

  var url;
  var query;
  var task;
  var svnPath = '/Users/chenchen/fuqiang/dev/blog7style';
  var buffer = [];
  var timeout = 10000;

  var COLOR = {
    red: '#d66',
    green: '#0a0',
    blue: '#00f'
  };

  var encodeHTML = function(str) {
    str = str.toString();
    return str.replace(/\&/g, '&amp;').
    replace(/"/g, '&quot;').
    replace(/</g, '&lt;').
    replace(/\>/g, '&gt;').
    replace(/\'/g, '&#39;').
    replace(/\u00A0/g, '&nbsp;').
    replace(/(\u0020|\u000B|\u2028|\u2029|\f)/g, '&#32;');
  };

  var output = function(str, color) {
    str = str || '';
    color = color ? 'style="color:' + color + ';"': '';
    try {
      str = '<p ' + color + '>' + encodeHTML(str) + '</p>';
    } catch(e) {
      str = e.message;
    }

    if (buffer.length) {
      str = buffer.map(function(content) {
        return '<p style="color:#00f;">' + encodeHTML(content) + '</p>';
      }).join('') + str;
      buffer.length = 0;
    }
    res.write(str);
  };

  var writeStyle = function() {
    res.write(['<style>', 'p{margin:0;padding:0;font-size:12px;line-height:16px;}', '</style>'].join(''));
  };

  try {
    buffer.push('url: ' + req.url);
    url = $url.parse(req.url);

    buffer.push('query: ' + url.query);
    query = $querystring.parse(url.query);

    svnPath = query.svn || svnPath;
    svnPath = decodeURIComponent(svnPath);
    buffer.push('query.svn: ' + svnPath);

    task = query.task || '';
    task = decodeURIComponent(task);
    buffer.push('query.task: ' + task);

    timeout = parseInt(query.timeout, 10) || 10000;
    buffer.push('query.timeout: ' + timeout);

  } catch(e) {
    res.writeHeader(404, 'text/html');
    writeStyle();
    output('error!', COLOR.red);
    output(e.toString(), COLOR.red);
    res.end();
    logger.info(e.toString());
  }

  if ($fs.existsSync(svnPath)) {

    res.writeHeader(200, {
      'content-type': 'text/html',
      'Transfer-Encoding': 'chunked'
    });

    writeStyle();

    output('--------------------');

    var Cmd = $child_process.spawn('svn', ['update'], {
      cwd: $path.dirname(svnPath)
    });

    Cmd.stdout.on('data', function(data) {
      output('' + data);
    });

    Cmd.stderr.on('data', function(data) {
      output('Error at : ' + (new Date()).toLocaleString(), COLOR.red);
      output(data, COLOR.red);
    });

    Cmd.on('close', function(code) {
      if (code !== 0) {
        output('Task process exited with code ' + code, COLOR.red);
      } else {
        output('Task execute success !', COLOR.green);
      }
      res.end();
    });

    res.setTimeout(timeout, function() {
      output('Task timeout at : ' + (new Date()).toLocaleString(), COLOR.red);
      res.end();
    });
  } else {
    res.writeHeader(404, 'text/html');
    writeStyle();
    output('Can\'t find the svnPath !', COLOR.red);
    res.end();
  }

}).listen(1314);


/*\
title: $:/core/modules/utils/filesystem.js
type: application/javascript
module-type: utils-node

File system utilities

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var fs = require("fs"),
	path = require("path");

/*
Recursively (and synchronously) copy a directory and all its content
*/
exports.copyDirectory = function(srcPath,dstPath) {
	// Remove any trailing path separators
	srcPath = $tw.utils.removeTrailingSeparator(srcPath);
	dstPath = $tw.utils.removeTrailingSeparator(dstPath);
	// Create the destination directory
	var err = $tw.utils.createDirectory(dstPath);
	if(err) {
		return err;
	}
	// Function to copy a folder full of files
	var copy = function(srcPath,dstPath) {
		var srcStats = fs.lstatSync(srcPath),
			dstExists = fs.existsSync(dstPath);
		if(srcStats.isFile()) {
			$tw.utils.copyFile(srcPath,dstPath);
		} else if(srcStats.isDirectory()) {
			var items = fs.readdirSync(srcPath);
			for(var t=0; t<items.length; t++) {
				var item = items[t],
					err = copy(srcPath + path.sep + item,dstPath + path.sep + item);
				if(err) {
					return err;
				}
			}
		}
	};
	copy(srcPath,dstPath);
	return null;
};

/*
Copy a file
*/
var FILE_BUFFER_LENGTH = 64 * 1024,
	fileBuffer;

exports.copyFile = function(srcPath,dstPath) {
	// Create buffer if required
	if(!fileBuffer) {
		fileBuffer = new Buffer(FILE_BUFFER_LENGTH);
	}
	// Create any directories in the destination
	$tw.utils.createDirectory(path.dirname(dstPath));
	// Copy the file
	var srcFile = fs.openSync(srcPath,"r"),
		dstFile = fs.openSync(dstPath,"w"),
		bytesRead = 1,
		pos = 0;
	while (bytesRead > 0) {
		bytesRead = fs.readSync(srcFile,fileBuffer,0,FILE_BUFFER_LENGTH,pos);
		fs.writeSync(dstFile,fileBuffer,0,bytesRead);
		pos += bytesRead;
	}
	fs.closeSync(srcFile);
	fs.closeSync(dstFile);
	return null;
};

/*
Remove trailing path separator
*/
exports.removeTrailingSeparator = function(dirPath) {
	var len = dirPath.length;
	if(dirPath.charAt(len-1) === path.sep) {
		dirPath = dirPath.substr(0,len-1);
	}
	return dirPath;
};

/*
Recursively create a directory
*/
exports.createDirectory = function(dirPath) {
	if(dirPath.substr(dirPath.length-1,1) !== path.sep) {
		dirPath = dirPath + path.sep;
	}
	var pos = 1;
	pos = dirPath.indexOf(path.sep,pos);
	while(pos !== -1) {
		var subDirPath = dirPath.substr(0,pos);
		if(!$tw.utils.isDirectory(subDirPath)) {
			try {
				fs.mkdirSync(subDirPath);
			} catch(e) {
				return "Error creating directory '" + subDirPath + "'";
			}
		}
		pos = dirPath.indexOf(path.sep,pos + 1);
	}
	return null;
};

/*
Recursively create directories needed to contain a specified file
*/
exports.createFileDirectories = function(filePath) {
	return $tw.utils.createDirectory(path.dirname(filePath));
};

/*
Recursively delete a directory
*/
exports.deleteDirectory = function(dirPath) {
	if(fs.existsSync(dirPath)) {
		var entries = fs.readdirSync(dirPath);
		for(var entryIndex=0; entryIndex<entries.length; entryIndex++) {
			var currPath = dirPath + path.sep + entries[entryIndex];
			if(fs.lstatSync(currPath).isDirectory()) {
				$tw.utils.deleteDirectory(currPath);
			} else {
				fs.unlinkSync(currPath);
			}
		}
	fs.rmdirSync(dirPath);
	}
	return null;
};

/*
Check if a path identifies a directory
*/
exports.isDirectory = function(dirPath) {
	return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
};

/*
Check if a path identifies a directory that is empty
*/
exports.isDirectoryEmpty = function(dirPath) {
	if(!$tw.utils.isDirectory(dirPath)) {
		return false;
	}
	var files = fs.readdirSync(dirPath),
		empty = true;
	$tw.utils.each(files,function(file,index) {
		if(file.charAt(0) !== ".") {
			empty = false;
		}
	});
	return empty;
};

/*
Recursively delete a tree of empty directories
*/
exports.deleteEmptyDirs = function(dirpath,callback) {
	var self = this;
	fs.readdir(dirpath,function(err,files) {
		if(err) {
			return callback(err);
		}
		if(files.length > 0) {
			return callback(null);
		}
		fs.rmdir(dirpath,function(err) {
			if(err) {
				return callback(err);
			}
			self.deleteEmptyDirs(path.dirname(dirpath),callback);
		});
	});
};

})();

'use strict';

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var plugins = require('gulp-load-plugins')();
var gutil = require('gulp-util');
var qunit = require('gulp-qunit');
var shell = require('gulp-shell');
var merge = require('merge-stream');
var size = require('gulp-check-filesize');
var jshint = require('gulp-jshint');

var build = {
  filename: 'rekord-validation.js',
  minified: 'rekord-validation.min.js',
  output: './build/',
  include: [
    './src/header.js',
    './src/lib/**/*.js',
    './src/footer.js'
  ]
};

var executeMinifiedBuild = function(props)
{
  return function() {
    return gulp
      .src( props.include )
      .pipe( sourcemaps.init() )
        .pipe( plugins.concat( props.minified ) )
        .pipe( plugins.uglify().on('error', gutil.log) )
      .pipe( sourcemaps.write('.') )
      .pipe( size({enableGzip: true}) )
      .pipe( gulp.dest( props.output ) )
    ;
  };
};

var executeBuild = function(props)
{
  return function() {
    return gulp
      .src( props.include )
      .pipe( plugins.concat( props.filename ) )
      .pipe( size({enableGzip: true}) )
      .pipe( gulp.dest( props.output ) )
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(jshint.reporter('fail'))
    ;
  };
};

var executeTest = function(file)
{
  return function() {
    return gulp.src( file ).pipe( qunit() );
  };
};

gulp.task('lint', function() {
  return gulp
    .src(build.output + build.filename)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'))
  ;
});

gulp.task( 'docs', shell.task(['./node_modules/.bin/jsdoc -c jsdoc.json']));
gulp.task( 'clean', shell.task(['rm -rf build/*.js', 'rm -rf build/*.map']));
gulp.task( 'test', executeTest( './test/index.html' ) );

gulp.task( 'js:min', executeMinifiedBuild( build ) );
gulp.task( 'js', executeBuild( build ) );
gulp.task( 'default', ['js:min', 'js']);

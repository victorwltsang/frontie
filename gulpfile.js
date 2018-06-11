/**
 * Variables
 */
var gulp           = require('gulp'),
    autoprefixer   = require('gulp-autoprefixer'),
    batch          = require('gulp-batch'),
    browserSync    = require('browser-sync'),
    changed        = require('gulp-changed'),
    concat         = require('gulp-concat'),
    del            = require('del'),
    foreach        = require('gulp-foreach'),
    ghPages        = require('gulp-gh-pages'),
    notify         = require('gulp-notify'),
    plumber        = require('gulp-plumber'),
    reload         = browserSync.reload,
    runSequence    = require('run-sequence'),
    sass           = require('gulp-sass'),
    sassLint       = require('gulp-sass-lint'),
    sourcemaps     = require('gulp-sourcemaps'),
    twig           = require('gulp-twig'),
    uglify         = require('gulp-uglify'),
    watch          = require('gulp-watch');

/**
 * Paths
 */
var paths = {
  dist: 'dist/',
  src: 'src/',
  deploy: 'dist/**/*',
  html: 'dist/*.html',
  browserSync: './dist',
  sass: {
    inputAll: 'src/sass/**/*.scss',
    input: 'src/sass/main.scss',
    output: 'dist/css',
    lint: 'src/sass/**/*.s+(a|c)ss'
  },
  jsVendor: {
    input: 'src/js/vendor/**/*.js',
    output: 'dist/js'
  },
  jsComponents: {
    input: 'src/js/components/**/*.js',
  },
  js: {
    input: 'src/js/main.js',
    output: 'dist/js'
  },
  img: {
    input: 'src/img/**/*',
    output: 'dist/img'
  },
  twig: {
    inputAll: 'src/templates/**/*.{twig,html}',
    inputLayouts: '!src/templates/layouts/**/*.{twig,html}',
    inputComponents: '!src/templates/components/**/*.{twig,html}',
    inputPartials: '!src/templates/partials/**/*.{twig,html}'
  },
  misc: {
    xml: 'src/*.xml',
    txt: 'src/*.txt'
  }
};

/**
 * Catch stream errors
 */
var onError = function (err) {
  notify.onError({
    title: "Gulp error in " + err.plugin,
    message: err.toString()
  })(err);
};

/**
 * Browser Sync
 */
gulp.task('browser-sync', function() {
  browserSync.init(null, {
    files: [paths.html],
    server: {
      baseDir: paths.browserSync
    },
    notify: false
  });
});

/**
 * Clean dist
 */
gulp.task('clean:dist', function() {
  return del.sync(paths.dist);
})

/**
 * CSS
 */
gulp.task('css', function () {
  return gulp.src(paths.sass.input)
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(autoprefixer('last 2 versions'))
    .pipe(sourcemaps.write('./', {addComment: false}))
    .pipe(gulp.dest(paths.sass.output))
    .pipe(browserSync.reload({stream:true}));
});

/**
 * Sass Lint
 */
gulp.task('sass-lint', function () {
  return gulp.src(paths.sass.lint)
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError())
});

/**
 * JS Vendor
 */
gulp.task('js:vendor', function() {
  return gulp.src(paths.jsVendor.input)
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('./', {addComment: false}))
    .pipe(gulp.dest(paths.jsVendor.output))
    .pipe(browserSync.reload({stream:true}));
});

/**
 * JS Main
 */
gulp.task('js:main',function(){
  return gulp.src([
    paths.js.input,
    paths.jsComponents.input
  ])
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())
    .pipe(concat('main.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('./', {addComment: false}))
    .pipe(gulp.dest(paths.js.output))
    .pipe(browserSync.reload({stream:true}));
});

/**
 * Images
 */
gulp.task('images', function() {
  return gulp.src([
    paths.img.input
  ], {
    'dot': true // include hidden files
  })
    .pipe(changed(paths.img.output))
    .pipe(gulp.dest(paths.img.output))
    .pipe(browserSync.reload({stream:true}));
});

/**
 * Twig
 */
gulp.task('twig',function(){
  return gulp.src([
    paths.twig.inputAll,
    paths.twig.inputLayouts,
    paths.twig.inputComponents,
    paths.twig.inputPartials
  ])
    .pipe(plumber({
      errorHandler: function (error) {
        console.log(error.message);
        this.emit('end');
    }}))
    .pipe(foreach(function(stream,file){
      return stream
        .pipe(twig())
    }))
    .pipe(changed(paths.dist))
    .pipe(gulp.dest(paths.dist));
});

/**
 * Copy miscellaneous files
 */
gulp.task('copy:misc', function() {
  return gulp.src([
    paths.misc.xml,
    paths.misc.txt
  ])
    .pipe(changed(paths.dist))
    .pipe(gulp.dest(paths.dist))
    .pipe(browserSync.reload({stream:true}))
});

/**
 * Task: Gulp Watch Sequence
 */
gulp.task('watch-files', function () {
  watch(paths.img.input, batch(function (events, done) {
    gulp.start('images', done);
  }));
  watch(paths.sass.inputAll, batch(function (events, done) {
    gulp.start('css', done);
  }));
  watch(paths.js.input, batch(function (events, done) {
    gulp.start('js:main', done);
  }));
  watch(paths.jsComponents.input, batch(function (events, done) {
    gulp.start('js:main', done);
  }));
  watch(paths.jsVendor.input, batch(function (events, done) {
    gulp.start('js:vendor', done);
  }));
  watch(paths.twig.inputAll, batch(function (events, done) {
    gulp.start('twig', done);
  }));
  watch([paths.misc.xml, paths.misc.txt], batch(function (events, done) {
    gulp.start('copy:misc', done);
  }));
});

/**
 * Task: Gulp Default
 */
gulp.task('default', function(done) {
  runSequence('build', [
    'watch-files',
    'browser-sync'
  ], done )
});

/**
 * Task: Gulp Build
 */
gulp.task('build', function (done) {
  runSequence('clean:dist', [
    'css',
    'js:vendor',
    'js:main',
    'images',
    'twig',
    'copy:misc'
  ], done )
})

/**
 * Task: Gulp Watch
 */
gulp.task('watch', function(done) {
  runSequence('watch-files', [
    'browser-sync'
  ], done )
});

/**
 * Task: Gulp Deploy
 */
gulp.task('deploy', function() {
  return gulp.src(paths.deploy)
    .pipe(ghPages());
});

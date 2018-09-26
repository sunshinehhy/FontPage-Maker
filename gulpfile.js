const gulp = require('gulp');
const del = require('del');//清除文件
const gulpLoadPlugins = require('gulp-load-plugins'); //自动加载配置文件中的已安装插件
const browserSync = require('browser-sync').create();//浏览器同步，快速响应文件更改并自动刷新页面
const wiredep = require('wiredep').stream;  //将bower安装的库及依赖引进html中
// const runSequence = require('run-sequence'); //任务独立，解除任务间的依赖，增强task复用
const sass = require('node-sass');
const cssnext = require('postcss-cssnext');
const useref = require('gulp-useref');
const merge = require('merge-stream');
const vinyl = require('vinyl');

const $ = gulpLoadPlugins();

gulp.task('styles', () => {
  return gulp.src('app/styles/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init({loadMaps:true}))  //要加载现有的源映射,传递选项loadMaps:true
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.', 'bower_components']
    }).on('error', $.sass.logError))
    // .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
    // .pipe($.postcss([$.autoprefixer]))//出错
    // .pipe($.postcss([require('autoprefixer')]))  //使用了 cssnext 就不再需要使用 Autoprefixer，因为cssnext 中已经包含了对 Autoprefixer 的使用。
    .pipe($.postcss([
      cssnext({ 
        features: {
          colorRgba: false
        }
      })
    ]))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(browserSync.reload({stream: true}));
});

gulp.task('scripts', () => {
  return gulp.src('app/scripts/**/*.js')
    .pipe($.plumber())  //自动处理全部错误信息防止因为错误而导致 watch 不正常工作
    .pipe($.sourcemaps.init({loadMaps:true})) 
    .pipe($.babel())
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe(browserSync.reload({stream: true}));
});
gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe($.imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest('dist/images'));
});
// Launch static server
gulp.task('serve', 
  gulp.parallel(
    'styles', 
    // 'scripts',
    () => {
    browserSync.init({
      server: {
        baseDir: ['app', '.tmp'],
        index: 'page-maker.html',
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    });
    // gulp.watch([ 'app/views/*.html',]).on('change', browserSync.reload);
    gulp.watch([ 'app/*.html',]).on('change', browserSync.reload);
    gulp.watch(['app/*.html', 'app/scripts/**/*.js', 'app/styles/**/*.scss'], browserSync.reload);
  })
);

gulp.task('clean', function() {
  return del(['.tmp/**', 'dist']).then(()=>{
    console.log('dir .tmp and dist deleted');
  });
});

gulp.task('html', gulp.series(['styles','scripts'], () => {
  return gulp.src('app/*.html')
    .pipe(useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if(/\.js$/, $.uglify({compress: {drop_console: true}})))
      .on('error', (err) => {
      if (err instanceof GulpUglifyError) {
        console.log('fileName'+err.fileName);
        console.log(err.cause);
        console.log(err.line);
      }
    })
    .pipe($.if(/\.css$/, $.cssnano()))

    .pipe($.if(/\.html$/, $.htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
}));

gulp.task('useref', gulp.series(['styles','scripts'], () => {
  return gulp.src('app/*.html')
  // .pipe(useref())
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    // .pipe(useref({searchPath: [ '.tmp/**/*','app/**/*']}))
    .pipe($.if('*.js', $.uglify()))

    .pipe($.if('*.css', $.cssnano()))

    // .pipe($.if('*.html', $.htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
}));

gulp.task('jshint', function () {
  return gulp.src('app/scripts/*.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.jshint.reporter('fail'));
});

gulp.task('build', gulp.parallel('jshint', 'html','images'));

// inject bower components
gulp.task('wiredep', () => {
  const scss = gulp.src('app/styles/*.scss')
  .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
  .pipe(gulp.dest('app/styles'));
  // const html = gulp.src('app/views/*.html')
  const html = gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
   .pipe(gulp.dest('app/'));
   // .pipe(gulp.dest('app/views'));
   return merge(scss, html);  
    //必须有此返回值，不然出现错误
    // The following tasks did not complete: wiredep
    // Did you forget to signal async completion?
});

gulp.task('copy:scripts', () => {
  const scripts = 'dev_cms/pagemaker/scripts';
  return gulp.src(['dist/scripts/*'])
    .pipe(gulp.dest(`../${scripts}`))
    .pipe(gulp.dest(`../testing/${scripts}`));
});
gulp.task('copy:styles', () => {
  const styles = 'dev_cms/pagemaker/styles';
  return gulp.src(['dist/styles/*'])
    .pipe(gulp.dest(`../${styles}`))
    .pipe(gulp.dest(`../testing/${styles}`));
});



gulp.task('copy:pagemaker', () => {
  const dest = 'dev_cms/pagemaker';
  return gulp.src(['dist/**/*', 'app/api*/**/*'])
    .pipe(gulp.dest(`../${dest}`))
    .pipe(gulp.dest(`../testing/${dest}`));
});

gulp.task('copy', gulp.series(
  'clean',
  'build', 
  gulp.parallel(
    'copy:pagemaker'
  )
));
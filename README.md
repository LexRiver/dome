# DOME

React-like library for manipulating DOM.
There is no virtual DOM in this library, so syntax like `<div>text</div>` directly creates DOM element.

# Install

```
npm install @lexriver/dome
```

# Import

```tsx
import { React, DomeComponent, DomeRouter, DomeManipulator, AnimatedText, AnimatedTable, AnimatedArray} from '@lexriver/dome'
```

## Creating component

```tsx
interface Attrs{
    counter:number
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>counter={this.attrs.counter}</div>
    }
    
}
```

or functional component

```tsx
const MyComponent = (attrs, children) => <div>counter={attrs.counter}</div>
```

## Mount component to DOM

```typescript
document.body.appendChild(<MyComponent counter={100} />)
```

## Example of component with dynamic content load

```tsx
interface Attrs{
    text:string
}

export class MyComponent extends DomeComponent<Attrs>{
    protected refContainer!:HTMLDivElement // for reference to main div of component
    render(){
        return <div ref={ref => this.refContainer = ref}>loading...</div>
    }
    async afterRender(){
        this.scheduleUpdate() // update component right after the first render
    }

    async updateAsync(){
        let remoteText = await fetch(...) // get remoteText from server
        DomeManipulator.replaceAllChildrenAsync(this.refContainer, <>text={remoteText}</>) // replace 'loading...' with text
    }
}
```

Special property `this.rootElement` can be used for reference to main element.

```tsx
export class MyComponent extends DomeComponent<Attrs>{
    render(){
        // div is rootElement for this component
        return <div>loading...</div> 
    }
    async afterRender(){
        this.scheduleUpdate()
    }

    async updateAsync(){
        let remoteText = await fetch(...) // get remoteText from server
        DomeManipulator.replaceAllChildrenAsync(this.rootElement, <>text={remoteText}</>) // replace 'loading...' with text
    }
}
```

Attributes (properties) for component are not read only, so we can change them, but `this.scheduleUpdate()` should be called to re-render the component.
Keep in mind that if parent component will be re-rendered then child component will be re-rendered also with attributes used in parent component.

```tsx
interface Attrs{
    text?:string
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        if(!this.attrs.text){
            return <div>loading...</div>
        }
        return <div>text={this.attrs.text}</div>
    }
    async afterRender(){
        this.attrs.text = await fetch(...)
        this.scheduleUpdate() // scheduleUpdate executes `updateAsync()` method if it is defined else `render()` method
    }
}
```

<br/>

There is no such thing as State of component.
It's recommended to use `Observable` attributes or the global state for application as a colleciton of observable variables.

## Example of Observable attributes

Every time the observable attribute changes then the `updateAsync()` or `render()` method will be executed.

```tsx
interface Attrs{
    textO:ObservableVariable<string>
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>text={this.attrs.textO.get()}</div>
    }
    async afterRender(){
        this.attrs.textO.set(await fetch(...)) // when fetch completes the component will be updated
    }
}

let myObservableStringO = new ObservableVariable<string>('default value')
setTimeout(() => {
    myObservableStrginO.set('another value')
}, 3000)

document.body.appendChild(<MyComponent textO={myObservableStringO} />)
```

For more details on `Observable` please visit: https://github.com/LexRiver/observable


<br/>

## Example of auto-unsubscribe component from some update events on component unmount from DOM

```tsx
export module GlobalState{
    export const someStringO = new ObservableVariable<string>('default text')
    export const someEvent = new TypeEvent<(counter:number)=>void>()
}

interface Attrs{
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>text={GlobalState.someStringO.get()}</div>
    }
    async afterRender(){
        GlobalState.someStringO.eventOnChange.subscribe((newValue) => {
            if(DomeManipulator.isInDom(this.rootElement) == false) return {unsubscribe:true} // remove this listener when component unmounts from DOM
            this.scheduleUpdate() // update component when someStringO changes
        })
        GlobalState.someEvent.subscribe((newValue:number) => {
            if(DomeManipulator.isInDom(this.rootElement) == false) return {unsubscribe:true} // remove this listener when component unmounts from DOM
            console.log('event in component')
            this.scheduleUpdate() // update component when someEvent triggers
        })
    }
}

document.body.appendChild(<MyComponent />)

setTimeout(() => {
    GlobalState.someStringO.set('another text') // change the value forces the component to update
}, 3000)

setTimeout(() => {
    GlobalState.someEvent.triggerAsync(100) // trigger the event forces the component to update
}, 5000)

setTimeout(() => {
    DomeManipulator.removeAllChildrenAsync(document.body) // remove component from DOM forces to unsubscribe from events, so the next event will not be triggered
}, 7000)

setTimeout(() => {
    GlobalState.someEvent.triggerAsync(100) // trigger the event, but no listeners
}, 10000)

```

<br/>
<br/>

There are also features for animation, dynamically change css classes and router, please keep reading.

# Setup your environment

```
npm install --save-dev @babel/cli @babel/core @babel/preset-env @types/node awesome-typescript-loader babel-loader copy-webpack-plugin css-loader express file-loader html-webpack-plugin image-webpack-loader mini-css-extract-plugin node-sass rimraf sass sass-loader serve-handler style-loader terser-webpack-plugin tslib tslint typescript webpack webpack-cli webpack-dev-middleware webpack-dev-server
```

```
npm install @lexriver/dome regenerator-runtime
```

<br/>

add file `webpack.config.common.js` to your root
```javascript
// webpack.config.common.js
const { resolve } = require('path');

module.exports = {
    compileJs: {
        test: /\.js$/,
        //use: ['babel-loader', 'source-map-loader'],s
        use: [
            {
                loader: 'babel-loader',
                options: {
                    rootMode: "upward",
                }
            }
        ],
    }
    ,
    compileTs: {
        test: /\.tsx?$/,
        use: [
            {loader: 'babel-loader'}, 
            {loader: 'awesome-typescript-loader'}
        ],
    }
    ,
    compileFonts: {
        test: /\.(woff(2)?|ttf|eot|otf|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
            {
                loader: 'file-loader',
                options: {
                    name: '[name].[hash].[ext]',
                    outputPath: 'fonts/'
                }
            }
        ]
    }
    ,
    compileImages: {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
            {loader: 'file-loader',
            options: {
                hash: 'sha512',
                digest:'hex',
                name:'img/[name].[hash].[ext]'
            }
        },
            {
                loader: 'image-webpack-loader',
                options: {
                    disable: true,
                    mozjpeg: {
                        progressive: true,
                        quality: 90
                    },
                    // optipng.enabled: false will disable optipng
                    optipng: {
                        enabled: false,
                    },
                    pngquant: {
                        quality: [0.80, 0.90], //Instructs pngquant to use the least amount of colors required to meet or exceed the max quality. If conversion results in quality below the min quality the image won't be saved.
                                            // Min and max are numbers in range 0 (worst) to 1 (perfect), similar to JPEG.
                        speed: 4
                    },
                    gifsicle: {
                        interlaced: false,
                    },
                    // the webp option will enable WEBP
                    // webp: {
                    //     quality: 75
                    // }
                }
            }
            //'file-loader?hash=sha512&digest=hex&name=img/[name].[hash].[ext]',
            //'image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false',
        ],
    }
}

```
<br/>
add file `webpack.config.dev.js` to your root

```javascript
// webpack.config.dev.js
// development config

const webpack = require('webpack');
const { resolve } = require('path');
const { CheckerPlugin } = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
//const HappyPack = require('happypack')
//const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')
const {compileJs, compileFonts, compileTs, compileImages} = require('./webpack.config.common')
const CopyPlugin = require('copy-webpack-plugin')

/*

node-sass -- provides binding for Node.js to LibSass, a Sass compiler.
sass-loader -- is a loader for Webpack for compiling SCSS/Sass files.
style-loader -- injects our styles into our DOM.
css-loader -- interprets @import and @url() and resolves them.
mini-css-extract-plugin -- extracts our CSS out of the JavaScript bundle into a separate file, essential for production builds.

*/


module.exports = {
    mode: 'development',
    entry: [
        'webpack-dev-server/client?http://localhost:8181',// bundle the client for webpack-dev-server and connect to the provided endpoint
        'webpack/hot/only-dev-server', // bundle the client for hot reloading, only- means to only hot reload for successful updates
        'regenerator-runtime/runtime',
        './src/website/App.tsx' // the entry point of our app
    ],
    output: {
        path: resolve(__dirname, './webpack-out'), //The output directory as an absolute path.
        publicPath: '/', //https://webpack.js.org/configuration/output/#outputpublicpath
        filename: '[name].[hash].bundle.js' //This option determines the name of each output bundle. The bundle is written to the directory specified by the output.path option.
    },    
    devServer: {
        hot: true, // enable HMR on the server
        port: 8181,
        historyApiFallback:true
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    //context: resolve(__dirname, './src/website'),
    module: {
        rules: [
            compileJs,
            compileTs,
            compileFonts,
            compileImages,
            {
                test: /\.css$/,
                use: [
                    { loader:'style-loader'}, 
                    { loader: 'css-loader', options: { importLoaders: 1 } }
                ],
            },
            {
                test: /\.m\.s(a|c)ss$/,
                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader', options: {modules: {localIdentName: '[path][name]--[local]'}, sourceMap:true}},
                    {loader: 'sass-loader', options: {sourceMap: true}}
                ]
            },
            {
                test: /\.(scss|sass)$/,
                exclude: /\.m\.s(a|c)ss$/,
                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader', options: { importLoaders: 1,  } },
                    {loader: 'sass-loader', options: {sourceMap: true } },
                ],
            },
        ],
    },
    plugins: [
        new CheckerPlugin(),
        //new HtmlWebpackPlugin({ template: 'index.html.ejs', }),
        new HtmlWebpackPlugin({ template: './webpack-src/index.html', }),
        //new HtmlWebpackPlugin(),
        new webpack.HotModuleReplacementPlugin(), // enable HMR globally
        new webpack.NamedModulesPlugin(), // prints more readable module names in the browser console on HMR updates
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css'
        }),

        //new HardSourceWebpackPlugin(), // https://github.com/mzgoddard/hard-source-webpack-plugin
        new CopyPlugin([
            {from: './webpack-src/site.webmanifest', flatten:true},
            {from: './webpack-src/*.png', flatten: true},
            {from: './webpack-src/favicon.ico'}
            //{from: './webpack-src/*.webmanifest'}
        ])

    ],
}
```
<br/>

add file `webpack.config.prod.js` to your root

```javascript
// webpack.config.prod.js
// production config
const { resolve } = require('path');
const { CheckerPlugin } = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const {compileJs, compileFonts, compileTs, compileImages} = require('./webpack.config.common')
//const MinifyPlugin = require("babel-minify-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin')


module.exports = {
    mode: 'production',
    entry: [
        //'@babel/polyfill',
        //'babel-polyfill',
        //'core-js/stable',
        'regenerator-runtime/runtime',
        './src/website/App.tsx',
    ],
    output: {
        filename: 'js/bundle.[hash].min.js',
        chunkFilename: 'js/bundle.[name].[hash].min.js',
        path: resolve(__dirname, './webpack-out/'),
        //path: './webpack-out/',
    },
    devtool: 'source-map', // generates source-maps https://webpack.js.org/configuration/devtool/
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    //context: resolve(__dirname, './src/website'),
    optimization: {
        minimize: true,
    },    
    module: {
        rules: [
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            rootMode: "upward",
                        }
                    }
                ],
            }
            ,
            {
                test: /\.tsx?$/,
                use: [
                    {loader: 'babel-loader'}, 
                    {loader: 'awesome-typescript-loader'}
                ],
            }
            ,
            compileFonts,
            compileImages,
            {
                test: /\.css$/,
                use: [
                    { loader:'style-loader'}, 
                    { loader: 'css-loader' }
                ],
            },
            {
                test: /\.m\.s(a|c)ss$/,
                use: [
                    {loader: MiniCssExtractPlugin.loader, options: {sourceMap: false}},
                    {loader: 'css-loader', options: {modules: {localIdentName:'[hash:base64:7]'}, sourceMap:false}},
                    {loader: 'sass-loader', options: {sourceMap: false}}
                ]
            },
            {
                test: /\.(scss|sass)$/,
                exclude: /\.m\.s(a|c)ss$/,
                use: [
                    {loader: MiniCssExtractPlugin.loader, options: {sourceMap: false}},
                    {loader: 'css-loader', options: {sourceMap: false} },
                    {loader: 'sass-loader', options: {sourceMap: false } },
                ],
            },
        ],
    },
    plugins: [
        new CheckerPlugin(),
        //new HtmlWebpackPlugin({ template: 'index.html.ejs', }),
        //new HtmlWebpackPlugin({ template: '../../webpack-src/index.html', }),
        new HtmlWebpackPlugin({template: './webpack-src/index.html'}),

        new MiniCssExtractPlugin({
            filename: 'css/[contenthash].css',
            chunkFilename: 'css/[id].[contenthash].css',
            //filename: 'css/[name].[hash].css',
            //chunkFilename: 'css/[id].[hash].css'
        }),
        new CopyPlugin([
            //{from: resolve(__dirname, './webpack-src/*.png'), to: resolve(__dirname, './webpack-out/')},
            //{from: resolve(__dirname, './webpack-src/*.ico'), to: resolve(__dirname, './webpack-out/')},
            {from: './webpack-src/site.webmanifest', flatten:true},
            {from: './webpack-src/*.png', flatten: true},
            {from: './webpack-src/favicon.ico'},
            //{from: './webpack-src/*.webmanifest'}
        ])

    ],
}

```

<br/>

Your `tsconfig.json` should be like this:

```javascript
    "compilerOptions": {
      /* Basic Options */
      "target": "esnext",
      "moduleResolution": "node",
      "module": "esnext",
      "jsx": "react",
      "declaration": true,                   /* Generates corresponding '.d.ts' file. */
      // "declarationMap": true,                /* Generates a sourcemap for each corresponding '.d.ts' file. */
      "sourceMap": true,                     /* Generates corresponding '.map' file. */
      // "outFile": "./",                       /* Concatenate and emit output to single file. */
      "outDir": "./out",                        /* Redirect output structure to the directory. */
      //"rootDir": "./",                       /* Specify the root directory of input files. Use to control the output directory structure with --outDir. */
      //"rootDir": "./src",
      // "composite": true,                     /* Enable project compilation */
      // "removeComments": true,                /* Do not emit comments to output. */
      // "noEmit": true,                        /* Do not emit outputs. */
      // "importHelpers": true,                 /* Import emit helpers from 'tslib'. */
      // "downlevelIteration": true,            /* Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'. */
      // "isolatedModules": true,               /* Transpile each file as a separate module (similar to 'ts.transpileModule'). */
  
      /* Strict Type-Checking Options */
      //"strict": false,
      "strict": true,                           /* Enable all strict type-checking options. */
      "noImplicitAny": false,                 /* Raise error on expressions and declarations with an implied 'any' type. */
      // "strictNullChecks": true,              /* Enable strict null checks. */
      // "strictFunctionTypes": true,           /* Enable strict checking of function types. */
      // "strictPropertyInitialization": true,  /* Enable strict checking of property initialization in classes. */
      // "noImplicitThis": true,                /* Raise error on 'this' expressions with an implied 'any' type. */
      // "alwaysStrict": true,                  /* Parse in strict mode and emit "use strict" for each source file. */
  
      /* Additional Checks */
      // "noUnusedLocals": true,                /* Report errors on unused locals. */
      // "noUnusedParameters": true,            /* Report errors on unused parameters. */
      // "noImplicitReturns": true,             /* Report error when not all code paths in function return a value. */
      // "noFallthroughCasesInSwitch": true,    /* Report errors for fallthrough cases in switch statement. */
  
      /* Module Resolution Options */
      // "moduleResolution": "node",            /* Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6). */
      // "baseUrl": "./",                       /* Base directory to resolve non-absolute module names. */
      // "paths": {},                           /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
      // "rootDirs": [],                        /* List of root folders whose combined content represents the structure of the project at runtime. */
      // "typeRoots": [],                       /* List of folders to include type definitions from. */
      // "types": [],                           /* Type declaration files to be included in compilation. */
      // "allowSyntheticDefaultImports": true,  /* Allow default imports from modules with no default export. This does not affect code emit, just typechecking. */
      "esModuleInterop": true,                   /* Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'. */
      // "preserveSymlinks": true,              /* Do not resolve the real path of symlinks. */
  
      /* Source Map Options */
      // "sourceRoot": "",                      /* Specify the location where debugger should locate TypeScript files instead of source locations. */
      // "mapRoot": "",                         /* Specify the location where debugger should locate map files instead of generated locations. */
      // "inlineSourceMap": true,               /* Emit a single file with source maps instead of having a separate file. */
      // "inlineSources": true,                 /* Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set. */
  
      /* Experimental Options */
      "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
      "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */
    }
  }
```

<br/>

add `babel.config.js` to your root:
```javascript
// use babel.config.js to apply to imported packages also
console.log('=== loading babel.config.js')
module.exports = {
    "presets": [
        [
            "@babel/env",{
                //"modules" : false, //By setting modules to false, we are telling babel not to compile our module code. This will lead to babel preserving our existing es2015 import/export statements.
                "targets": {
                    "browsers": [
                        "cover 99.5%" 
                    ]
                }
            }
        ],
  
    ],
    "plugins": [
    ]
} 
```

<br/>

add `typings.d.ts` to your root:
```javascript
declare module "*.module.css";
declare module "*.module.scss";
declare module "*.m.scss";
declare module "*.png"
declare module "*.jpg"
```

<br/>


create file `./src/website/App.tsx`
```typescript
import { React, DomeRouter, DomeManipulator } from '@lexriver/dome'
import css from './App.m.scss'

const App = () => (
    <div id="app" class={css.app}>
        hello world
    </div>
)
document.body.appendChild(<App />)
```

<br/>

cerate file `./src/website/App.m.scss`
```css
.app {
    border: solid 1px green;
}
```
<br/>

add these scripts to your package.json:
```json
    "scripts": {
        "build": "npm run clean-webpack-out && webpack -p --config=webpack.config.prod.js",
        "clean-webpack-out": "rimraf webpack-out/*",
        "lint": "tslint './src/**/*.ts*' --format stylish --project . --force",
        "start": "npm run start-dev",
        "start-dev": "webpack-dev-server --config=webpack.config.dev.js"
    }

```

<br/>

So when you run
```
npm run start
```
the development process will be started on localhost:8181

and when your run
```
npm run build
```
the production website will be generated in ./webpack-out

<br/>
<br/>
<br/>


# API

# DomeComponent

Create a custom component

```tsx
interface Attrs{ // to add custom attributes to your component
    id?:number
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>id={this.attrs.id}, children={this.children}</div>
    }
}
```

Then use it like this 
```tsx
    <MyComponent id={100}>Text inside</MyComponent>
```

There are also internal attributes for any component:
*    `ref?:(ref)=>void` - to take a reference to this component
*    `onShowAnimation?:Animation` - animation for show element
*    `onHideAnimation?:Animation` - animation for hide element

And `Animation` type is

```typescript
export interface Animation{
    cssClassName:string
    timeMs:number // time in milliseconds before removing cssClassName from element
}
```

Use these attributes like so:
```tsx
    <MyComponent id={100} ref={ref => myRef = ref} onShowAnimation={{cssClassName:css.animationShow, timeMs:300}} onHideAnimation={myHideAnimationObject} />
```

<br/>

## Style html elements

Inline styles:

```tsx
<div style={{backgroundColor:'green', border: 'solid 1px red'}}></div>
```

Css classes could be set by using `class` attribute or by aliases `className` and `cssClasses`

```tsx
<div class='class1 class2'></div>
<div className='class1 class2'></div> //same
<div cssClasses='class1 class2'></div> //same
```

Instead of string [`CssClass`](###cssClass-type) type can be used, for example:
```tsx
<div class={['class1', 'class2']} />
<div class={{'class1':true, 'class2':myObservableBooleanO}}
```

Please see `DomeManipulator.setCssClasses(..)` for more details.

<br/>

## Events for html elements

To create an event use standart event names but in camel case:

```tsx
<button onClick={(e) => {e.preventDefault(); console.log('click')}}>click me</button>
```

<br/>

## Set inner html

To set inner html for element:
```tsx
<div innerHtml={`<strong>hi</strong>`} />
```

<br/>

## Properties for DomeComponent

## `rootElement:Element|HTMLElement`

This is a reference to root element like `<div></div>` that was used in first render.
Do not use it with fragment `<></>` as a root element.

## `attrs`

Contains all attributes for component including internal attributes (see above)

## `children`

Contains all children inside component

<br/>

## Methods for custom component

## init()

This method is for overwrite. It will be executed before first render.

```tsx
interface Attrs{ // to add custom attributes to component
    id?:number
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>id={this.attrs.id}, children={this.children}</div>
    }

    init(){
        console.log('init!')
    }
}
```

<br/>

## render()

This method must be overwritten. It will be executed when component first rendered and also when updated if `updateAsync()` was not overwritten.

This method must return DOM element or elements.

To return a few elements fragment syntax `<></>` can be used.

```tsx
interface Attrs{
    id?:number
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <>
            <div>id={this.attrs.id}</div>
            <div>children={this.children}</div>
            </>
    }
}
```

<br/>

## afterRender()

This method will be executed after first render.

```tsx
interface Attrs{
    id?:number
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>id={this.attrs.id}</div>
    }
    afterRender(){
        console.log('after render') 
    }
}

```

<br/>

## updateAsync()

This method can be overwritten. By default this method will call `render()` method to update the component. And after that `afterUpdate()` will be executed.

Use method `scheduleupdate()` to force component to re-render.

```tsx
interface Attrs{
    id?:number
}

export class MyComponent extends DomeComponent<Attrs>{
    render(){
        return <div>id={this.attrs.id}</div>
    }
    afterRender(){
        setTimeout(() => {
            this.attrs.id = 200
            this.scheduleUpdate()
        }, 3000)
    }
    async updateAsync(){
        DomeManipulator.replaceAllChildrenAsync(this.rootElement, <>after update: id={this.attrs.id}</>) 
    }
    afterUpdate(){
        console.log('component updated!')
    }
}

```

<br/>

## scheduleUpdate()

Use this method to force update the component. This method is not for overwrite.
It should be used inside component:

```tsx
    this.scheduleUpdate()
```

<br/>

## afterUpdate()

This method will be executed after component update, but not after first render.
Overwrite this method to take effect.







<br/>
<br/>
<br/>

# Animation

To add an animation for render or update component use attributes `onShowAnimation` and `onHideAnimation`.

These attributes uses an `Animation` type:

```typescript
export interface Animation{
    cssClassName:string // the name of css class to be applied to DOM element
    timeMs:number // amount of milliseconds to wait before removing cssClassName from element
}
```
<br/>

```css
/* style.m.scss */
@keyframes zoomIn {
    from {
        opacity: 0;
        transform: scale3d(0.3, 0.3, 0.3);
    }

    50% {
        opacity: 1;
    }

    80% {
        transform: scale3d(1.05,1.05,1.05);
    }
}

.zoomIn {
    animation: zoomIn 400ms linear forwards;
}
```
<br/>

And use it in `.tsx` file

```tsx
import css from './style.m.scss'

<MyComponent onShowAnimation={{cssClassName:css.zoomIn, timeMs:400}} />
```


To apply animation for list of items please see below.











<br/>
<br/>
<br/>

# DomeManipulator

DomeManipulator is a module for manipulating DOM.

### `DomeManipulator.hideElementAsync(element: Element, animation?:Animation)`

Use this method to temporarily hide the element

```tsx
await DomeManipulator.hideElementAsync(myRef, myAnimation)
```

<br/>


### `DomeManipulator.unhideElementAsync(element: Element, animation?:Animation)`

Use this method to unhide element that was hidden by `.hideElementAsync(..)`

<br/>


### `DomeManipulator.insertAsFirstChildAsync(elementToInsert: Element, parentElement: Element | DocumentFragment, animation?:Animation)`

Insert element as a first child for container.

<br/>

### `DomeManipulator.insertBeforeAsync(elementToInsert: Element, refElement: Element | null, parentElement: Element | DocumentFragment, animation?:Animation)`

Insert element before another element.

<br/>

### `DomeManipulator.insertAfterAsync(elementToInsert: Element, refElement: Element | null | undefined, parentElement: Element | DocumentFragment, animation?:Animation)`

Insert element after another element.

<br/>

### `DomeManipulator.insertByIndexAsync(elementToInsert: Element, index: number, parentElement: Element | DocumentFragment, animation?:Animation)`

Insert element after element with exact index in parent.

<br/>


### `DomeManipulator.replaceAsync(oldElement: Element, newElement: Element, animationHide?:Animation, animationShow?:Animation)`

Replace one element with another element.

<br/>

### `DomeManipulator.removeElementAsync(element: Element, animation?:Animation)`

Remove element from DOM.

<br/>

### `DomeManipulator.forEachChildrenOf(element:Element, action:(child:ChildNode)=>void)`

Do some action for each child nodes of element.

<br/>

### `DomeManipulator.removeAllChildrenAsync(element: Element, animation?:Animation)`

Remove all children for element.

<br/>

### `DomeManipulator.appendChildAsync(containerElement:Element, child:Element, animation?:Animation)`

Append child to container element.

<br/>

### `DomeManipulator.appendChildrenAsync(containerElement:Element, children:Element | Element[] | DocumentFragment | Text | string | null | undefined, animation?:Animation)`

Append one or few children to container element.

<br/>

### `DomeManipulator.replaceAllChildrenAsync(...)`

```typescript
    replaceAllChildrenAsync(
        containerElement: Element, 
        childrenToInsert: Element | Element[] | DocumentFragment | Text | string | null | undefined, 
        animationForHide?:Animation, 
        animationForShow?:Animation
    )
``` 

Replace all children for container element.

<br/>

### `DomeManipulator.isInDom(el: Element | undefined)`

Check if element is in DOM. Uses `document.body.contains(el)` internally, so it could be not so fast.

<br/>

### `DomeManipulator.addCssClassAsync(element: Element, cssClassName: string, removeAfterMs?:number)`

Add css class to element and remove it after `removeAfterMs` milliseconds if provided.

<br/>

### `DomeManipulator.addCssClassesAsync(element: Element, cssClassNames: string[], removeAfterMs?:number)`

Add few css classes to element and remove them after `removeAfterMs` milliseconds if provided.

<br/>

### `DomeManipulator.removeCssClass(element: Element, cssClassName: string)`

Remove css class from element.

<br/>

### `DomeManipulator.removeCssClasses(element: Element, cssClassNames: string[])`

Remove few css classes from element.

<br/> 


### `DomeManipulator.setCssClasses(element: Element, value: CssClass)`

Replace css classes for element.

#### CssClass type

```typescript
export type CssClass = {[key:string]:boolean|ObservableVariable<boolean>} | string[] | string
```

Where value is an array like

```typescript
['class1', 'class2]
```

or object

```typescript
{'class1':true, 'class2':false}
```

or object with [`ObservableVariable<boolean>`](https://github.com/LexRiver/observable) as values 

```typescript
{'class1':myBooleanO, 'class2':false}
```

or string with space separated css class list

```typescript
'class1 class2'
```

example

```typescript
DomeManipulator.setCssClasses(myDiv, {'class1':true, 'class2':myObsVariableO})
DomeManipulator.setCssClasses(myDiv, 'class1 class2')
```

<br/>

### `DomeManipulator.setAttribute(element: Element, name: string, value: any)`

Change attribute for html element

```typescript
DomeManipulator.setAttribute(myDiv, 'data-id', 100)
```

<br/>

### `DomeManipulator.hasFocus(el: Element):boolean`

Check if element has focus

```typescript
DomeManipulator.hasFocus(myDiv) // boolean
```

<br/>

### `DomeManipulator.scrollIntoView(element: Element, paddingFromTop:number = 100)`

Smooth scroll element into view with some padding from top of the screen

```typescript
DomeManipulator.scrollIntoView(myDiv)
```

<br/>

### `DomeManipulator.scrollToTop()`

Smooth scroll to top

```typescript
DomeManipulator.scrollToTop()
```







<br/>
<br/>
<br/>

# DomeRouter

Use DomeRouter for navigation in SinglePageApplication.

```typescript
DomeRouter.onRoute('/about', true, async (params, url) => {
    const { PageAbout } = await import('./pages/PageAbout') // dynamic import component
    DomeManipulator.replaceAllChildrenAsync(divContainer, <PageAbout />, animationHide, animationShow) // replace current page with new page
})
```

to navigate to another route without page reload use `DomeRouter.navigate('/url')`.
Here is example of `Link` component:

```tsx
interface Attrs{
    url:string|Promise<string>
    class?:string|{[key:string]:boolean}|{[key:string]:ObservableVariable<boolean>}
    style?:{[key:string]:string|number}
    newTab?:boolean
}

export class Link extends DomeComponent<Attrs>{
    refA!:HTMLAnchorElement
    
    render(){
        return <a ref={ref => this.refA = ref} {...this.attrs.style?{style:this.attrs.style}:null}>{this.children}</a>
    }

    async afterRender(){
        if(this.attrs.class){
            DomeManipulator.setCssClasses(this.refA, this.attrs.class)
            //this.refA.classList.add(this.attrs.class)
        }
        if(this.attrs.newTab){
            this.refA.setAttribute('target', '_blank')
            this.refA.setAttribute('rel', 'noopener noreferrer')
        }
        const url = await this.attrs.url
        this.refA.setAttribute('href', url)
        if(!this.attrs.newTab){
            this.refA.onclick = (e) => {
                e.preventDefault()
                DomeRouter.navigate(url)
            }
        }

    }
}
```

<br/>

## DomeRouter API

### `DomeRouter.maxHistoryUrlsCount`

Count of urls to keep to go back in history. The default value is 10.

```typescript
DomeRouter.maxHistoryUrlsCount = 100
```

<br/>

### `DomeRouter.navigate(url:string)`

Navigate to specific url

```typescript
DomeRouter.navigate('/login')
```

<br/>

### `DomeRouter.changeUrl(url:string)`

Just change the url without navigating.

```typescript
DomeRouter.changeUrl('/fake-page')
```

<br/>

### `DomeRouter.getCurrentUrl():string`

Get current url pathname, like `/login`

```typescript
console.log('currentUrl=', DomeRouter.getCurrentUrl())
```

<br/>

### `DomeRouter.getPreviousPageUrl(previousPageIndex:number=0):string|undefined`

Get url of previous page by index where 0 is previous page, 1 is previous page minus 1, etc...

```typescript
console.log('previous url = ', DomeRouter.getPreviousPageUrl())
```

<br/>

### `DomeRouter.reloadCurrentPage(addToHistory:boolean = false)`

Reload current page

<br/>

### `DomeRouter.resolveUrl(url:string = window.location.pathname, addToHistory:boolean = true)`

Execute action defined for `url` in `onRoute` method

```typescript
DomeRouter.resolveUrl('/about')
```

<br/>

### `DomeRouter.onRoute(route:string, exactMatch:boolean, action:RouteAction)`

Add reaction on route change.
Parameters:
* `route:string` must starts with '/', for example '/login' or '/'. To add a parameter add `:` before parameter name: `/product/:id`
* `exactMatch:boolean` if true then will be triggered only if whole route matches the pattern
* `action:RouteAction` is a method to execute if route matches

Where `RouteAction` type is:
```typescript
export type RouteAction = (params:{[key:string]:string}, url:string) => void|Promise<void>
```

example:
```typescript
DomeRouter.onRoute('/login', true, (params, url) => changePage(<PageLogin />))
DomeRouter.onRoute('/product/:productId', true, (params, url) => {
    // for example for '/product/456' the output will be
    // 'productId=', '456', string
    console.log('productId=', params.productId, typeof params.productId) 
})
```

A type of parameter can be added, for example :
```typescript
DomeRouter.onRoute('/product/:productId<number>', true, (params, url) => {
    // for example for '/product/456' the output will be
    // 'productId=', 456, number
    console.log('productId=', params.productId, typeof params.productId) 
})
```

A possible types are:
* `int` - uses `parseInt(p)` internally
* `float` - uses `parseFloat(p)` internally
* `number` - uses `Number(p)` intrenally
But there is no validation for paramters, so the result of specified function will be returned.

```typescript
DomeRouter.onRoute('/product/:productId<int>', true, (params, url) => {
    // for example for '/product/456' the output will be
    // 'productId=', 456, number
    console.log('productId=', params.productId, typeof params.productId) 
})
```

### `DomeRouter.onNotFound(action:()=>void)`

This method will be executed if path doesn't match any of routes assigned by '.onRoute' methods

```typescript
DomeRouter.onNotFound(() => changePage(<Page404 />))
```





<br/>
<br/>
<br/>

# AnimatedText

`AnimatedText` is a component for displaying text and when text is changing update the component with animation.

```tsx
import { React, DomeComponent, AnimatedText } from '@lexriver/dome'

let myTextO = new ObservableVariable<string>('default text')
<AnimatedText textO={myTextO} onHideAnimation={{cssClassName:'hideAnimation', timeMs:300}} onShowAnimation={{cssClassName:'showAnimation', timeMs:300}} />

setTimeout(() => {
    myTextO.set('another text')
}, 3000)
```

<br/>
<br/>
<br/>

# Animated Array

`AnimatedArray` class can be used to display list of items, that could be dynamically changed / added / removed with animation.

```tsx
interface Attrs{
}

export class AnimatedListTest extends DomeComponent<Attrs>{
    currentArray:number[] = [100,101,102,103,104,105, 106, 107, 108, 109]
    animatedArray = new AnimatedArray<number>({
        animationHide:{cssClassName:cssAnimation.fadeOut1000, timeMs:1000},
        animationShow:{cssClassName:cssAnimation.fadeIn1000, timeMs:1000},
        array: [],
        getKey: (x:number) => 'key'+x,
        getHtmlElement: (x:number) => {
            return <div>the number is {x}</div>
        },
    })

    render(){
        return <div></div>
    }

    afterRender(){
        let x = 200
        
        setInterval(() => { // dynamically update list every 2 seconds
             this.currentArray.push(x++)
             this.currentArray.splice(2,1)
             this.animatedArray.update((this.currentArray), this.rootElement)
        }, 2000)
                
        this.animatedArray.update(this.currentArray, this.rootElement)
    }
}
```

```scss
// Animation.m.scss

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }

    to {
        opacity: 0;
    }
}


.fadeIn1000{
    animation: fadeIn 1000ms linear forwards;
}
.fadeOut1000{
    animation: fadeOut 1000ms linear forwards;
}
```



<br/>
<br/>
<br/>

# AnimatedTable

Component `AnimatedTable` can be used to display html table where items couled be dynamically changed.

```tsx
interface Attrs{

}

export class Pages extends DomeComponent<Attrs>{
    refList?:HTMLDivElement
    pagesO = new ObservableVariable<JsonPage[]>([])
    isLoadingO = new ObservableVariable<boolean>(true)

    render(){
        return <div ref={ref => this.refList = ref}>

                    <AnimatedTable<JsonPage> 
                        animationShowRow={{cssClassName:cssAnimation.fadeIn300, timeMs:300}}
                        animationHideRow={{cssClassName:cssAnimation.fadeOut300, timeMs:300}}
                        animationHideTable={{cssClassName:cssAnimation.fadeOut300, timeMs:300}}
                        animationShowTable={{cssClassName:cssAnimation.fadeIn300, timeMs:300}}
                        animationHideEmptyList={{cssClassName:cssAnimation.fadeOut300, timeMs:300}}
                        animationShowEmptyList={{cssClassName:cssAnimation.fadeIn300, timeMs:300}}
                        //animationHideLoading={{cssClassName:cssAnimation.fadeOut300, timeMs:300}}
                        //animationShowLoading={{cssClassName:cssAnimation.fadeIn300, timeMs:300}}
                        renderTableHead={() => this.renderTableHead()}
                        tableBody={<tbody></tbody>}
                        tableElement={<table></table>}
                        getKey={(page:JsonPage) => 'key'+page.id}
                        renderTableRow={(page:JsonPage) => this.renderTableRow(page)}
                        itemsO={this.pagesO}
                        isLoadingO={this.isLoadingO}
                        renderEmptyList={()=><span></span>}
                        renderLoading={()=><div>loading...</div>}
                    />

                </div>
    }

    afterRender(){
        // console.log('afterRender()')
        this.updatePagesAsync()
    }

    async updatePagesAsync(){
        const pages:JsonPage[] = await Server.getAllPagesAsync()
        //if(!this.refList) return

        //DomeManipulator.replaceAllChildrenAsync(this.refList, this.renderCustomPages(pages))
        this.pagesO.set(pages)
        this.isLoadingO.set(false)
    }

    renderTableHead() {
        return <thead>
            <tr>
                <th></th>
                <th><strong>Name</strong></th>
                <th><strong>URL</strong></th>
            </tr>
        </thead>
    }

    renderTableRow(page: JsonPage) {
        return <tr>
            <td>
                <div>
                    
                    <button onClick={() => {
                        DomeRouter.navigate( /* get page url to edit (page.id) */)
                    }} />
                    <button onClick={async () => {
                        try {
                            // delete page code...
                            // update
                            this.updatePagesAsync()
                
                        } catch(x){
                            console.error(x)
                        }

                    }} />
                </div>
            </td>
            <td>
                <div>{page.name}</div>
                <div>{page.title}</div>
            </td>
            <td>
                <Link url={`${page.url}`} newTab={true}>{page.url}</Link>
            </td>
        </tr>
    }

}

```


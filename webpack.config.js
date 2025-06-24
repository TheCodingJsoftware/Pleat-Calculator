const path = require('path');
const fs = require('fs');
const glob = require('glob');
const globAll = require('glob-all');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { GenerateSW } = require('workbox-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';
const entries = {};
const pagesDir = path.join(__dirname, 'src/pages');

// Dynamically find page entries
fs.readdirSync(pagesDir).forEach(folder => {
    const entryFile = path.join(pagesDir, folder, `${folder}.ts`);
    if (fs.existsSync(entryFile)) {
        entries[folder] = entryFile;
    } else {
        console.warn(`⚠️ No entry file found for: ${folder}`);
    }
});

// Create HtmlWebpackPlugins dynamically
const htmlPlugins = Object.keys(entries).map(name => {
    const templatePath = path.join(pagesDir, name, `${name}.html`);
    if (fs.existsSync(templatePath)) {
        return new HtmlWebpackPlugin({
            template: templatePath,
            filename: `${name}.html`,
            chunks: [name],
            minify: isProduction,
        });
    }
    console.warn(`⚠️ No HTML template found for: ${name}`);
    return null;
}).filter(Boolean);

module.exports = {
    mode: isProduction ? 'production' : 'development',
    entry: entries,
    output: {
        filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].bundle.js',
        path: path.resolve(__dirname, 'public'),
        publicPath: '/',
        clean: true,
    },
    devtool: isProduction ? false : 'source-map',
    devServer: {
        static: { directory: path.join(__dirname, 'public') },
        compress: true,
        hot: true,
        open: true,
        historyApiFallback: true,
        client: {
            overlay: true,
        }
    },
    cache: {
        type: 'filesystem',
        compression: 'gzip',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
            "@utils": path.resolve(__dirname, "src/utils"),
            "@static": path.resolve(__dirname, "src/static"),
        },
        fallback: {
            fs: false,
            path: false,
            buffer: false,
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'esbuild-loader',
                options: {
                    loader: 'ts',
                    target: 'es2017'
                },
            },
            {
                test: /\.js$/,
                loader: 'esbuild-loader',
                options: {
                    loader: 'js',
                    target: 'es2017',
                },
            },
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: false,
                        },
                    },
                ],
            }

        ],
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                },
            },
        },
        runtimeChunk: 'single',
    },
    plugins: [
        new PurgeCSSPlugin({
            paths: globAll.sync([
                path.join(__dirname, 'src/**/*.{ts,tsx,js,jsx,html}'),
                path.join(__dirname, 'src/pages/**/*.html'),
            ]),
            safelist: { standard: [/^html/, /^body/, /^#/, /^\.*/] }, // optional: adjust as needed
        }),
        new MiniCssExtractPlugin({
            filename: isProduction ? 'css/[name].[contenthash].css' : 'css/[name].bundle.css',
        }),
        new ForkTsCheckerWebpackPlugin({
            async: true,
            typescript: {
                configFile: path.resolve(__dirname, 'tsconfig.json'),
                diagnosticOptions: {
                    semantic: true,
                    syntactic: true,
                },
                mode: 'write-references', // optional, for faster large builds
            },
        }),
        ...htmlPlugins,
        new GenerateSW({
            swDest: 'service-worker.js',
            clientsClaim: true,
            skipWaiting: true,
            maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // allow bigger caching
            runtimeCaching: [
                {
                    urlPattern: ({ request }) => request.mode === 'navigate',
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'html-pages',
                    },
                },
                {
                    urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|woff2?)$/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'static-assets',
                    },
                }
            ],
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'src', 'manifest.json'),
                    to: path.resolve(__dirname, 'public', 'manifest.json')
                },
                {
                    from: path.resolve(__dirname, 'src', 'static'),
                    to: path.resolve(__dirname, 'public', 'static'),
                    noErrorOnMissing: true
                },
                {
                    from: path.resolve(__dirname, 'src', 'robots.txt'),
                    to: path.resolve(__dirname, 'public', 'robots.txt'),
                    noErrorOnMissing: true
                },
                {
                    from: path.resolve(__dirname, 'src', 'google9d968a11b4bf61f7.html'),
                    to: path.resolve(__dirname, 'public', 'google9d968a11b4bf61f7.html'),
                    noErrorOnMissing: true
                }
            ]
        }),
    ],
};

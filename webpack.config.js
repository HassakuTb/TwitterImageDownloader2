const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	mode: "production",

	entry: {
		'options': "./app/pages/options/options.tsx",
		'background': "./app/scripts/Background.ts",
		'content': "./app/scripts/ImageInfoResolver.ts",
	},

	output: {
		path: `${__dirname}/app/dist`,
		filename: '[name].bundle.js',
	},

	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader"
			},
      {
        test: /\.html$/,
        loader: "html-loader"
      },
		]
	},

  plugins:[
	new webpack.SourceMapDevToolPlugin({}),
    new HtmlWebpackPlugin({
      chunks: ["options"],
			filename: "options.html",
			title: "Twitter Image Downloader Options",
    }),
	],
	
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".jsx"]
	}
}
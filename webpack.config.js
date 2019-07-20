module.exports ={
    mode: "production",

    entry: {
        'app/dist/background' : "./app/scripts/Background.ts",
        'app/dist/content' : "./app/scripts/ImageInfoResolver_Twitter.ts",
    },

    output: {
        path: __dirname,
        filename: '[name].bundle.js',
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader"
            }
        ]
    },

    resolve: {
        extensions: [".ts"]
    }
}
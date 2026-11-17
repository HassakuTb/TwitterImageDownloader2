# TwitterImageDownloader2
browser extension for download image in twitter

# Video download (beta)
Turn on "Enable video download (beta)" in the options to add "Download Video (beta)" to the browser's context menu on videos and GIFs.
It saves the highest quality mp4 (GIFs are saved as mp4) with the same filename format as images.

The mp4 url is not in the page, only in the tweet data that X loads.
While the beta is on, the extension registers a script that runs in X's page (the page's JavaScript world, which needs the "scripting" permission) and reads that data from X's network responses and React props.
When it is off, the script is unregistered. Chrome 102+ or Firefox 128+ is required.

# Build
```
> npm install
> npm run build
```

After successful build,  `twitterimagedownloader.xpi` file will show in release folder.
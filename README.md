# TwitterImageDownloader2
browser extension for download image in twitter

# Video download and download of all media in a post (beta)
Turn on "Enable video download and download of all media in a post (beta)" in the options to add "Download Video (beta)" to the browser's context menu on videos and GIFs.
It saves the highest quality mp4 (GIFs are saved as mp4) with the same filename format as images.

It also adds "Download All Media in Post (beta)" to the browser's context menu on the text or a blank area of a post (not on its images).
It saves every photo of the post at once, and its videos and GIFs unless "Include videos and GIFs in "Download All Media in Post"" is turned off.
The files are named like the ones saved one by one. The "Save As" dialog is not shown for it, and "-<imageindex>" is added before ".<ext>" when the filename format has neither <imageindex> nor <original>.
In the image viewer, right-click the dark area around the image.

The mp4 url and the list of a post's media are not in the page, only in the tweet data that X loads.
While the beta is on, the extension registers a script that runs in X's page (the page's JavaScript world, which needs the "scripting" permission) and reads that data from X's network responses and React props.
When it is off, the script is unregistered. Chrome 102+ or Firefox 128+ is required.

# Build
```
> npm install
> npm run build
```

After successful build,  `twitterimagedownloader.xpi` file will show in release folder.
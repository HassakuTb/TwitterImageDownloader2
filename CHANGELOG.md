## 2.3.0 - 2026-11-18
### Added
Settings to open the browser's context menu on images, since X now shows its own menu there: Shift + right-click (default on), always (default off).
Download videos and GIFs (beta, off by default). "Download Video (beta)" saves the highest quality mp4 (GIFs are saved as mp4) with the same filename format as images. While it is on, a video's poster saved by "Download Original Image" is also named like the video. Needs Chrome 102+ or Firefox 128+.
Download all media in a post (beta, with the same setting as video download). Right-click the text or a blank area of a post and choose "Download All Media in Post (beta)" to save all its photos, videos and GIFs at once (videos and GIFs can be excluded in the options). "Save As" is not used for it, and "-<imageindex>" is added to the filename when the format has neither <imageindex> nor <original>. A toast tells when some of them could not be saved.

### Fixed
Fix download from the media tab (/<user>/media?filter=photo).
Fix post date and user name of images in a quoted tweet and in the image viewer.
Detect the original image format (jpg / png) instead of guessing it from the page.

### Changed
Keep the Save button pinned to the bottom of the options page.
Add the "scripting" permission. It is used only while video download (beta) is on, to run a script in X's page that reads the video data X has loaded.
Require Firefox 109 or later (the extension uses Manifest V3).
Rewrite the image resolver to support the new X web client (x-web) as well.
Remove emoji from the <username> tag. The user id is used when nothing is left.
Remove support for the classic Twitter UI (before 2019) and the jQuery dependency.

## 2.2.13 - 2024-06-23
### Added
Support time of day in filename format.

## 2.2.12 - 2024-05-18
### Fixed
Remove "/" in user name.

## 2.2.11 - 2024-05-18
### Added
Support x.com domain.
Add UserName tags in filename format. (experimental)

## 2.2.10 - 2023-12-09
### Added
Support media tab for twitter.com.

## 2.2.9 - 2023-12-03
### Added
Add PostDate tags in filename format.

## 2.2.8 - 2023-12-02
### Added
Add support for pro.twitter.com.

## 2.2.7
### Changed
Apply manifest version 3.

## 2.2.6 - 2023-08-01
### Fixed
Fixed an issue where images could not be downloaded from webp thumbnails.

## 2.2.5 -2022-06-08
### Changed
Make text clearer.

## 2.2.4 -2021-06-06
### Added
Add support for firefox extension.
Add auto package scripts.

## 2.2.2 -2021-05-04
### Added
Add Datetime tags in filename format.

## 2.2.1 - 2021-01-25
### Added
ファイル名に利用できるタグにオリジナルファイル名を追加

### Fixed
ファイル名に利用される画像番号の説明と実際の挙動が一致していない問題を修正

## 2.2.0 - 2020-06-17
### Added
保存するファイル名を変更できるように変更

### Changed
オプション画面の見た目を変更

## 2.1.1 - 2019-07-21
### Fixed
オプション[download to]が空欄のとき、自動的にディレクトリを作成する不具合を修正

## 2.1.0 - 2019-07-21
### Added
TweetDeckに一部対応

## 2.0.1 - 2019-07-20
### Fixed
画像のプレビュー画面から正常にリネームされない問題を修正

## 2.0.0 - 2019-07-20
### Added
「新しいTwitter」に対応

### Changed
内部実装を大幅に変更  
旧UIのtwitter.comにて、画像のダウンロード元を新UIのtwitter.comで利用されているものに変更  
ユーザー名が解決取得できないとき、ファイル名が「TIL-unknown-{画像ソースのURLの一部}.{拡張子}」になるように変更  
HTTPSプロトコルのときのみ有効になるように変更

## 0.2.4 - 2018-02-23
### Fixed
オプションメニューの表示に関する軽微な不具合を修正

## 0.2.3 - 2018-02-23
### Added
単一画像ツイートのギャラリーモード(画像詳細)で利用できるように変更

## 0.2.1 - 2018-02-23
### Fixed
「open "save as" window」のオプションが機能しない不具合を修正

## 0.2.0 - 2018-02-22
初版
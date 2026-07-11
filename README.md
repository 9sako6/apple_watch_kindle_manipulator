# Apple Watch Kindle Remote

Apple WatchやiPadOSのメディア操作を、iPad Safari上のKindle for Web / Kindle Cloud Readerのページ送りへ変換するUserscripts用ユーザースクリプトです。Apple Developer Programや独自のiOSアプリは必要ありません。

## 必要なもの

- iPad
- iPadとペアリングされたApple Watch
- App Storeの[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)
- Macまたは、生成済みスクリプトをiPadへ渡す手段

Userscriptsは無料のオープンソースSafari拡張です。ソースコードは[quoid/userscripts](https://github.com/quoid/userscripts)で公開されています。

## スクリプトの生成

```sh
npm install
npm run build
```

`dist/kindle-remote.user.js`が生成されます。

## iPadへのインストール

1. iPadへUserscriptsをインストールして一度起動します。
2. Userscriptsが使用するスクリプト保存フォルダを確認します。
3. `kindle-remote.user.js`をAirDropまたはiCloud DriveでiPadへ送り、その保存フォルダへ置きます。
4. iPadの「設定」から「アプリ」>「Safari」>「機能拡張」>「Userscripts」を開き、有効にします。
5. Webサイトアクセスは、次のKindleドメインだけ許可します。
   - `read.amazon.co.jp`
   - `read.amazon.com`
   - `read.amazon.co.uk`
6. SafariでKindle for Webを開き、Safariの機能拡張メニューからスクリプトが有効になっていることを確認します。

## 使い方

1. Kindle for Webで本を開きます。
2. 右下の`Kindle Remote`パネルで`Next`と`Previous`を試します。
3. `Enable remote controls`を押します。
4. iPadのコントロールセンターで「次へ」「前へ」を試します。
5. Apple Watchの「再生中」で「次へ」「前へ」を試します。

次のMedia Session操作を割り当てています。

- `nexttrack`、`seekforward`: 次ページ
- `previoustrack`、`seekbackward`: 前ページ

## 結果表示

操作パネルとSafari Web Inspectorのconsoleに、最終実行時刻、入力元、試した方式、結果を表示します。

ページ送り後のDOM変化を確認できた場合は、その方式を成功として表示します。イベント送信後に変化を検出できない場合は`all-dispatched-unconfirmed`と表示します。これは必ずしも失敗を意味しないため、実際のページも確認してください。

## プライバシー

- 外部通信を行いません。
- Kindle本文、アカウント情報、ハイライト、読書履歴を保存、抽出、コピー、送信しません。
- UserscriptsのネットワークAPIを要求しません。
- スクリプトの自動更新URLを設定しません。
- ページ移動要素を探すためのDOM属性は、その場でのみ参照します。

## 制約

iPadOSがApple Watchのメディア操作をSafariのMedia Sessionへ配送するかは、OSバージョンや再生状態に依存する可能性があります。パネル操作、iPadのメディア操作、Apple Watchの順に確認すると、失敗箇所を切り分けられます。

## 開発

```sh
npm install
npm run check
npm run build
```

実装は`src/userscript.ts`に集約しています。生成物は`dist/kindle-remote.user.js`の1ファイルです。

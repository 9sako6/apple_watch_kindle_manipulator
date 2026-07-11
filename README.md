# Apple Watch Kindle Manipulator

Apple WatchやiOS/iPadOSのメディア操作を、iPhoneまたはiPadのSafari上にあるKindle for Web / Kindle Cloud Readerのページ送りへ変換するUserscripts用ユーザースクリプトです。Apple Developer Programや独自のiOSアプリは必要ありません。

## 最新版をインストール

iPhoneまたはiPadのSafariで[インストールページ](https://9sako6.github.io/apple_watch_kindle_manipulator/)を開きます。スクリプトをコピーするか、Userscriptsで直接開けます。

更新は自動ではありません。新しいバージョンへ更新するときも同じページから手動で再インストールしてください。[ビルド済みJSを直接開く](https://9sako6.github.io/apple_watch_kindle_manipulator/kindle-remote.user.js)こともできます。過去のビルドは[GitHub Releases](https://github.com/9sako6/apple_watch_kindle_manipulator/releases)から取得できます。

## 必要なもの

- iPhoneまたはiPad
- iPhoneとペアリングされたApple Watch
- App Storeの[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)

Userscriptsは無料のオープンソースSafari拡張です。ソースコードは[quoid/userscripts](https://github.com/quoid/userscripts)で公開されています。

## iPhone・iPadへのインストール

1. iPhoneまたはiPadへUserscriptsをインストールして一度起動します。
2. Userscriptsが使用するスクリプト保存フォルダを確認します。
3. 端末の「設定」から「アプリ」>「Safari」>「機能拡張」>「Userscripts」を開き、有効にします。
4. Webサイトアクセスは、次のKindleドメインだけ許可します。
   - `read.amazon.co.jp`
   - `read.amazon.com`
   - `read.amazon.co.uk`
5. Safariで[インストールページ](https://9sako6.github.io/apple_watch_kindle_manipulator/)を開きます。
6. `Userscriptsで開く`を押し、Safariの機能拡張メニューからインストールします。必要なら`スクリプトをコピー`も利用できます。
7. Kindle for Webを開き、スクリプトが有効になっていることを確認します。

## 使い方

1. Kindle for Webで本を開きます。
2. 右下の`Apple Watch Kindle Manipulator`パネルで`Next`と`Previous`を試します。
3. 本の開き方に合わない場合は`Page direction`を`Next right`または`Next left`へ変更します。
4. `Enable remote controls`を押します。停止するときは同じボタンの`Disable remote controls`を押します。
5. iPhoneまたはiPadのコントロールセンターで「次へ」「前へ」を試します。
6. Apple Watchの「再生中」で「次へ」「前へ」を試します。

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

iOS/iPadOSがApple Watchのメディア操作をSafariのMedia Sessionへ配送するかは、端末、OSバージョン、再生状態に依存する可能性があります。パネル操作、端末のメディア操作、Apple Watchの順に確認すると、失敗箇所を切り分けられます。

## 開発

```sh
mise run setup
mise run check
```

`setup`は初回の依存導入、`check`は型検査、テスト、ビルドをまとめて実行します。実装は`src/userscript.ts`、生成物は`dist/kindle-remote.user.js`です。

## リリース

初回のみ、GitHubの`Settings` > `Pages`で`Source`を`GitHub Actions`にします。`main`へのpushが、検証後に最新版をGitHub Pagesへ公開します。

`package.json`のversionがリリースバージョンの正本です。新しいversionを指定すると、検証、commit、tag、pushまでまとめて実行します。

```sh
mise run release -- 0.2.1
```

releaseはcleanで最新の`main`からのみ実行でき、mainとtagをatomic pushします。`v*`タグのGitHub Actionsは、バージョン履歴としてGitHub Releaseへ成果物を添付します。

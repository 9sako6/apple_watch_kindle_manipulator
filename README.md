# Apple Watch Kindle Manipulator

Apple Watchから、iPhoneやiPadのSafariで開いているKindleのページをめくれます。

寝ながらKindleを読むときに、画面へ手を伸ばさず「次へ」「前へ」を操作するためのスクリプトです。Apple Developer Programは必要ありません。

## 必要なもの

- iPhoneまたはiPad
- Apple Watch
- 無料のSafari拡張[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)

## インストール

1. iPhoneまたはiPadへUserscriptsをインストールし、一度開きます。
2. 「設定」>「アプリ」>「Safari」>「機能拡張」>「Userscripts」を有効にします。
3. UserscriptsのWebサイトアクセスで、使うKindleサイトを許可します。
   - `read.amazon.co.jp`
   - `read.amazon.com`
   - `read.amazon.co.uk`
4. Safariで[インストールページ](https://9sako6.github.io/apple_watch_kindle_manipulator/)を開き、`Userscriptsで開く`を押します。

## 使い方

1. SafariのKindle for Webで本を開きます。
2. 右下のパネルで`Next`と`Previous`が動くことを確認します。
3. `Enable remote controls`を押します。
4. Apple Watchで「再生中」を開き、「次へ」「前へ」を押します。

ページの向きが逆なら、パネルの`Page direction`を`Next right`または`Next left`へ変更してください。

## 困ったとき

- 途中で動かなくなったら、Kindleのページを再読み込みしてもう一度有効にします。
- Apple Watchに操作が出ないときは、iPhoneまたはiPadのコントロールセンターで先に「次へ」「前へ」を試します。
- 動作は端末やOSのバージョン、再生状態に左右されます。

このスクリプトはKindleの本文やアカウント情報を保存・送信しません。

## ライセンス

[MIT License](LICENSE)

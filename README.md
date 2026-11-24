# 試盤

模擬盤。開波有 **100 萬港元虛擬資金**，可以買升、沽空、揀槓桿（最多 500 倍）。價錢跟公開市價，賺蝕同爆倉都係真數。唔係真錢，唔使登入，冇入金、出金、身份審查。

畫面頂永遠有一句：「呢個係模擬盤，用虛擬資金，唔係真錢交易」。

## 點試

```bash
npm install && npm run dev
```

打開 [http://localhost:3000](http://localhost:3000)。

1. **市況** 有比特幣、以太幣，同蘋果、特斯拉、輝達、微軟、亞馬遜、谷歌、標普。價錢來自 Yahoo Finance 公開圖表，再用美元兌港元折算。攞唔到價就話「報價暫時攞唔到」，唔會估一個價。
2. 撳一隻去 **落單**。蠟燭圖、最新價、開多或開空、市價或限價、金額、槓桿。撳 **確認** 先落單。保證金、爆倉價、手續費（0.04%）會寫喺按鈕上面。
3. **持倉** 見到權益、可用、保證金、未平倉賺蝕、已實現，同最近紀錄。保證金蝕清就爆倉，只蝕呢張單嘅保證金。
4. **重新開始** 會清走紀錄，返去 100 萬。全部記喺呢部機。

美股收市之後仍然顯示最後成交價，並標明收市價。手機闊大約 390 都用到：市況、落單、持倉三個掣。

報價唔使鑰匙。伺服器讀 Yahoo Finance 嘅公開 `chart` 接口（`query1.finance.yahoo.com`），再用 `HKD=X` 折成港元。

## 舊版

我座城留喺 [`archive/ngo-zo-sing`](https://github.com/ezggj/talktgtla/tree/archive/ngo-zo-sing)，冇改寫 git history。想返去起城：

```bash
git fetch origin archive/ngo-zo-sing
git checkout archive/ngo-zo-sing
```

再早嘅健身同傾偈喺 [`archive/talk-tgt-la-fitness`](https://github.com/ezggj/talktgtla/tree/archive/talk-tgt-la-fitness)。`/train`、`/eat`、`/chat` 會見到收檔提示。

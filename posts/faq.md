---
layout: default
---

# FAQ

### 1. Why `db.js`?

If you've done much work with IndexedDB you'll have noticed that the API isn't quite as fluent as it could be, particularly when it comes to querying. The aim of `db.js` is to make it a whole lot easier to do this kind of thing. Primarily I wanted to provide a Promise-based interface for developing against IndexedDB.

### 2. What browsers does it support?

Currently `db.js` is designed to work with the latest version of the IndexedDB spec (May 2012) and this means that it should work in browsers that have implemented that (Firefox 13+ and Chrome 20+). There is some level of backwards compatibility that means IE10 (Windows 8 Consumer Preview) is supported and *some* support for older WebKit implementations (which rely on the `setVersion` implementation).

If you find it **not** working in a browser which has IndexedDB support raise an issue.


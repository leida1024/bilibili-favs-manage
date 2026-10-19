import resolve from '@rollup/plugin-node-resolve';
import banner from 'rollup-plugin-banner2';
import { readFileSync } from 'node:fs';
import { CONFIG } from './src/config/config.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
if (version !== CONFIG.SCRIPT.VERSION) throw new Error('package.json 与 CONFIG.SCRIPT.VERSION 必须一致');

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/BilibiliFavsManage.user.js',
    format: 'iife',
    name: 'BilibiliFavsManager'
  },
  plugins: [
    resolve(),
    banner(() => {
      return `// ==UserScript==
// @name         Bilibili 收藏夹批量管理
// @namespace    http://tampermonkey.net/
// @version      ${CONFIG.SCRIPT.VERSION}
// @description  批量复制 B 站收藏夹（复选框列表 + 跨页面流程 + 过滤"我追的"）
// @author       leida1024
// @match        https://space.bilibili.com/*
// @run-at       document-start
// @noframes
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

`;
    })
  ]
};

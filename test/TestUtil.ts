// Code is from video "Mutant killing demo" from link attached in
// 2022 WT1 CPSC310 piazza:https://piazza.com/class/l7qenrnq7oy512/post/11

import * as fs from "fs-extra";

const persistDir = "./data";

const getContentFromArchives = (name: string): string =>  // without {} no need to write "return"
	fs.readFileSync("test/resources/archives/" + name).toString("base64");

function clearDisk(): void {
	fs.removeSync(persistDir);
}

export {getContentFromArchives, persistDir, clearDisk};

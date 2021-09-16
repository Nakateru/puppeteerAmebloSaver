const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const readline = require('readline');

(async () => {
    console.log('Puppeteer Ameba Blog Saver 1.1');
    console.log('Author: Nakateru(2021.09.16)');

    //input URL
    const bloUrl = await inputUrl();
    //console.log(bloUrl);
    //const bloUrl = 'https://ameblo.jp/ske48official/theme-10111458673.html';

    //analyze url
    const urlInfo = analyzeUrl(bloUrl);
    //console.log(urlInfo);
    console.log('List Name: ' + urlInfo[1]);

    //open	browser
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        defaultViewport: {width: 800, height: 600}
    });

    //entrylist
    if (urlInfo[1] === 'entrylist') {
		console.log('Page No: ' + urlInfo[2]);

		 //open newPage
        const page = await browser.newPage();
		
		//search entry url and save in entryUrlArr
		const entryUrlArr = await turnPage(page);
	
		console.log('Found ' + entryUrlArr.length + ' Entr(ies) in this ' + urlInfo[1]);
		//console.log(entryUrlArr)
		
		await Promise.all(entryUrlArr.map(async(x) => {
			const page = await browser.newPage();
			await page.setDefaultNavigationTimeout(0); 
			await saveEntry(page, x);
			await page.close();
		}));
		
    //theme or archive
    } else if(urlInfo[1] === 'theme' || urlInfo[1] === 'archive') {
		console.log('Page No: ' + urlInfo[2]);
        console.log('List Id: ' + urlInfo[3]);

        //open newPage
        const page = await browser.newPage();
		
		//search entry url and save in entryUrlArr
		const entryUrlArr = await turnPage(page);
	
		console.log('Found ' + entryUrlArr.length + ' Entr(ies) in this ' + urlInfo[1]);
		//console.log(entryUrlArr)
		
		await Promise.all(entryUrlArr.map(async(x) => {
			const page = await browser.newPage();
			await page.setDefaultNavigationTimeout(0); 
			await saveEntry(page, x);
			await page.close();
		}));

	//entry
    } else {
		//open newPage
		const page = await browser.newPage();
        await saveEntry(page, bloUrl);
		
    }

	//close browser
	console.log('Done!')
	await browser.close();
	//process.exit();
    //---------------------------------------------------------

    //input url function
    function inputUrl() {
        const reader = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            reader.question('Input AmeBlo Entry URL:', url => {
                if (url.startsWith('https://ameblo.jp/')) {
                    const re = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})/);
                    console.log('Blog Username: ' + re.groups.userName);
                    resolve(url);
                    reader.close();
                } else {
                    console.log('Error URL!');
                    process.exit();
                }
            });
        });
    }

    //save images function
    function saveImg(path, imgUrl) {
        https.get(imgUrl, res => {
            const stream = fs.createWriteStream(path);
            res.pipe(stream);
            stream.on('finish', () => {
                stream.close();
                console.log('saved ' + path);
            });
        });
    }

    //analyze url function
    function analyzeUrl(url) {
        try {
            const re = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/(?<listName>\w+)/);
            const userName = re.groups.userName;
            const listName = re.groups.listName;
            var relListName = undefined;
            var listPage = undefined;
            var listId = undefined;

            if (listName === 'entrylist') {
                console.log('This is an entry list sorted by newest arrivals');
                relListName = listName;
                const re2 = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/entrylist-(?<listPage>\d+)/);
                if (re2 != null) {//entrylist page 2~
                    listPage = re2.groups.listPage;
                } else {//entrylist page 1
                    listPage = '1';
                }
                return [userName, relListName, listPage];

                //theme
            } else if (listName.startsWith('theme')) {
                console.log('This is an entry list classified by themes');
                const re2 = listName.match(/theme(?<listPage>\d+)/);

                //page 2~
                if (re2 != null) {
                    relListName = 'theme';
                    listPage = re2.groups.listPage;

                    //page 1
                } else {
                    relListName = 'theme';
                    listPage = '1';
                }
                //find list id
                const re3 = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/(?<listName>\w+)-(?<listId>\d+)/);
                listId = re3.groups.listId;

                return [userName, relListName, listPage, listId];

                //month
            } else if (listName.startsWith('archive')) {
                console.log('This is an entry list classified by months');
                const re2 = listName.match(/archive(?<listPage>\d+)/);

                //page 2~
                if (re2 != null) {
                    relListName = 'archive';
                    listPage = re2.groups.listPage;
                    //page 1
                } else {
                    relListName = 'archive';
                    listPage = '1';

                }
                //find list id
               const re3 = url.match(/ameblo.jp\/(?<userName>[a-zA-Z0-9-]{3,24})\/(?<listName>\w+)-(?<listId>\d+)/);
                listId = re3.groups.listId;

                return [userName, relListName, listPage, listId];

                //entry
            } else if (listName === 'entry') {
                console.log('This is an entry');
                relListName = 'entry';
                const re3 = url.match(/ameblo.jp\/(?<userName>\w+)\/entry-(?<listId>\d+)/);
                listId = re3.groups.listId;

                return [userName, relListName, listId];

                //error
            } else {
                console.log('Error URL');
                process.exit();
            }
        } catch {
            console.log('Error URL');
            process.exit();
        }
    }

    //save entry function
    async function saveEntry(page, url) {
		//goto Page
        await page.goto(url,{
			waitUntil:'load',
			timeout:0
		});

        //find blog title
        var titleText = await page.$eval('h1', element => element.textContent);
        console.log('Blog Title: ' + titleText);

        //find blog time
        var timeText = await page.$eval('time', element => element.textContent);
        console.log('Blog Time: ' + timeText);
        //replace NEW!
        if (timeText.includes('NEW!')) {
            timeText = timeText.replace('NEW!', '');
            //console.log(timeText);
        }

        //find images url
        const imgArr = await page.$$eval('img', ele => ele.map(x => x.getAttribute("src")));
        //console.log(imgArr);

        //image name
        var num = 1;
        timeText = timeText.split(' ')[0];
        titleText = titleText.replace(/[\\:*?"<>|/]/g, "")
        const pathName = timeText + ' ' + titleText;

        //create directory
        const isExists = fs.existsSync(pathName);
        if (!isExists) {
            fs.mkdirSync(pathName);
        }

        //save entry text
        const entry = await page.$eval('div[class="skin-entryInner"]', element => element.innerText);
        // console.log(entry);
        const entryTxt = pathName + '/' + pathName + ".txt";
        fs.writeFile(entryTxt, entry.toString(), {flag: "w"}, function (err) {
            if (!err) {
                console.log('saved ' + entryTxt);
            } else {
                console.log(err);
            }

        });

        //select user_images
        imgArr.map(x => {
            if (x.startsWith('https://stat.ameba.jp/user_images/')) {
                saveImg(pathName + '/' + pathName + ' ' + num + '.jpg', x.replace("?caw=800", ""));
                num++;
            }
        });
    }

    //is clickable function
    async function isClickable(page,to='Next') {
        try{
            const res = await page.$eval('a[data-uranus-component=pagination' + to + ']', ele => ele.getAttribute('class'));
            return !res.includes('is-disabled');
        }catch{
            return false;
        }
    }

    //get entry urls of theme function
	async function getEntryUrl(page){
	//get entry urls
	var arr = await page.$$eval('div[data-uranus-component="entryItem"] > div > div > a',ele => ele.map(x => x.getAttribute('href')));
	
	//remove secret entry (remain except 'secret.ameba')
	arr = arr.filter(arr => !arr.startsWith('https://secret.ameba.jp/'));
	
	//replace urls
	arr = arr.map(e => 'https://ameblo.jp' + e.replace('?frm=theme',''));
	//console.log(entryArr);
	
	return arr;
	}

	//turn Page function
	async function turnPage(page){
		//goto Page
		await page.goto(bloUrl);

        //Page number
        const originalNum = urlInfo[2];
        var num = originalNum;
        console.log('Searching entry on Page ' + num);

        //get Page 1 entry urls and saved in entryArr
        var entryArr = await getEntryUrl(page);

        //turn to Next Page
        while (await isClickable(page,'Next')){
            num++;
            console.log('Searching entry on Page ' + num);
			
			//entrylist
			if(urlInfo[1] === 'entrylist'){
				await page.goto('https://ameblo.jp/' + urlInfo[0] + '/entrylist-' + num +'.html');	
			//theme or archive				
			}else{
				await page.goto('https://ameblo.jp/' + urlInfo[0] + '/' + urlInfo[1] + num + '-' + urlInfo[3] + '.html');
			}

            //get Page 2~ entry url
            entryArr = entryArr.concat(await getEntryUrl(page));
        }

        //turn to Prev Page
        //if turn from page 2~, get entry url from  Page (originalNum-1) to Page 1
        if(originalNum!=='1'){
            for(num=originalNum-1;num>0;num--){
                console.log('Searching entry on Page ' + num);
				
                //entrylist
				if(urlInfo[1] === 'entrylist'){
					await page.goto('https://ameblo.jp/' + urlInfo[0] + '/entrylist-' + num +'.html');	
				//theme or archive				
				}else{
					await page.goto('https://ameblo.jp/' + urlInfo[0] + '/' + urlInfo[1] + num + '-' + urlInfo[3] + '.html');
				}
				
                //get Page 2~ entry url
                entryArr = entryArr.concat(await getEntryUrl(page));
            }
			return entryArr;
        }else{
            return entryArr;
        }	
	}

})();
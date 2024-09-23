// ==UserScript==
// @name         Control Tower MPV CSV Exporter
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Export assignments to CSV on Control Tower MPV page
// @inject-into  auto
// @author       Esteban Reyes
// @match        https://beta.control-tower.meta.amazon.dev/HOU3/assignments*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('Script is running');

    function parseNodeList(nodeList) {
        if (!nodeList || nodeList.length < 2) return [];
        const keys = Array.from(nodeList[0].querySelectorAll('th span')).map(span => span.textContent.trim());
        const result = [];
        for (let i = 1; i < nodeList.length; i++) {
            const row = nodeList[i];
            if (row.innerHTML.includes("DISABLED")) continue;
            const values = Array.from(row.querySelectorAll('td span')).map(span => {
                const nestedDiv = span.querySelector('div a');
                if (nestedDiv) {
                    return nestedDiv.textContent.trim();
                }
                return span.textContent.trim().replace(/<br>/g, ' ');
            });
            const obj = keys.reduce((acc, key, index) => {
                acc[key] = values[index] || '';
                return acc;
            }, {});
            result.push(obj);
        }
        return result;
    }

    function convertToCSV(arrayOfObjects) {
        const flatArray = arrayOfObjects.flat();
        const csvRows = flatArray.map(obj => `${obj.Assignment},${obj.Employee}`);
        const allEmployees = flatArray.map(obj => obj.Employee).join(',');
        csvRows.push(`"${allEmployees}"`);
        return csvRows.join('\n');
    }

    function downloadCSV(csvString, filename) {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    function addButtonAndEventListener() {
        const button = document.createElement('button');
        button.className = 'css-22i92q';
        button.type = 'button';
        button.innerHTML = '<div class="css-109kszg">High Stress Path CSV</div>';

        const navElement = document.querySelector('nav');
        if (navElement) {
            console.log('Nav element found');
            const lastDiv = navElement.querySelectorAll('div')[7];
            if (lastDiv) {
                console.log('Last div found');
                if (lastDiv.firstChild) {
                    lastDiv.insertBefore(button, lastDiv.firstChild);
                } else {
                    lastDiv.appendChild(button);
                }
            } else {
                console.error('Last div not found');
            }
        } else {
            console.error('Nav element not found');
        }

        button.addEventListener('click', () => {
            const elm = document.querySelector('.css-1bvjzap').firstChild;
            if (!elm) {
                console.error('#expandable-20 element not found');
                return;
            }
            const tableLists = elm.querySelectorAll('.css-1gzvnq8');
            console.log(tableLists.length)
            if (tableLists.length > 11) {
                console.error('Not enough tables found');
                return;
            }

            const unloaderRaw = tableLists[1].querySelectorAll('tr');
            const waterspiderRaw = tableLists[2].querySelectorAll('tr');
            const endoflineRaw = tableLists[7].querySelectorAll('tr');

            const unLoaderList = parseNodeList(unloaderRaw);
            const waterSpiderList = parseNodeList(waterspiderRaw);
            const endOfLineList = parseNodeList(endoflineRaw);

            const csvString = convertToCSV([unLoaderList, waterSpiderList, endOfLineList]);
            downloadCSV(csvString, `assignments_${new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}).replace(/[\s,:]/g, '_').replace(/\/|,|AM|PM/gi, '')}.csv`);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButtonAndEventListener);
    } else {
        addButtonAndEventListener();
    }
})();

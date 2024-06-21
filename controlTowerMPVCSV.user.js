// ==UserScript==
// @name         Control Tower MPV CSV Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export assignments to CSV on Control Tower MPV page
// @inject-into auto
// @author       Esteban Reyes
// @match        https://beta.control-tower.meta.amazon.dev/HOU3/assignments
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function parseNodeList(nodeList) {
        // Ensure nodeList is not empty and has at least two elements
        if (!nodeList || nodeList.length < 2) return [];

        // Extract keys from the first <tr> element
        const keys = Array.from(nodeList[0].querySelectorAll('th span')).map(span => span.textContent.trim());

        // Process remaining <tr> elements to extract values
        const result = [];
        for (let i = 1; i < nodeList.length; i++) {
            const row = nodeList[i];

            // Check if the row is marked as "DISABLED"
            if (row.innerHTML.includes("DISABLED")) continue;

            const values = Array.from(row.querySelectorAll('td span')).map(span => {
                // If the span contains a nested structure (like the <div>), handle it accordingly
                const nestedDiv = span.querySelector('div a');
                if (nestedDiv) {
                    return nestedDiv.textContent.trim();
                }
                return span.textContent.trim().replace(/<br>/g, ' '); // Replace <br> with space for better formatting
            });

            // Create an object using keys and values
            const obj = keys.reduce((acc, key, index) => {
                acc[key] = values[index] || '';
                return acc;
            }, {});

            result.push(obj);
        }

        return result;
    }

    function convertToCSV(arrayOfObjects) {
        // Flatten the array of arrays into a single array of objects
        const flatArray = arrayOfObjects.flat();

        // Extract CSV rows
        const csvRows = flatArray.map(obj => `${obj.Assignment},${obj.Employee}`);

        // Extract all employee names and join them with commas
        const allEmployees = flatArray.map(obj => obj.Employee).join(',');

        // Add the final line with all employee names, enclosed in double quotes to ensure it's treated as a single cell
        csvRows.push(`"${allEmployees}"`);

        // Convert the array of CSV rows into a single string separated by new lines
        const csvString = csvRows.join('\n');
        
        return csvString;
    }

    function downloadCSV(csvString, filename) {
        // Create a Blob from the CSV string
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");

        if (link.download !== undefined) { // feature detection
            // Create a link to the file
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
    
        // Find the <nav> element by its class
        const navElement = document.querySelector('nav.css-bzzs1r');
        if (navElement) {
            // Find the last div inside the nav element
            const lastDiv = navElement.querySelectorAll('div')[7];
            if (lastDiv) {
                // If the lastDiv has a first child, insert the button before it
                if (lastDiv.firstChild) {
                    lastDiv.insertBefore(button, lastDiv.firstChild);
                } else {
                    // If the lastDiv has no children, just append the button
                    lastDiv.appendChild(button);
                }
            }
        }
    
        // Add event listener to the button for downloading the CSV
        button.addEventListener('click', () => {
            //node list of all tables in control tower
            const elm = document.querySelector('#expandable-20')
            const tableLists = elm.querySelectorAll('.css-1gzvnq8') 
            // variables for the unloaders,Water Spiders and end of line
            const unloaderRaw = tableLists[8].querySelectorAll('tr');
            const waterspiderRaw = tableLists[9].querySelectorAll('tr');
            const endoflineRaw = tableLists[10].querySelectorAll('tr');
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
        // DOMContentLoaded has already fired
        addButtonAndEventListener();
    }
})();
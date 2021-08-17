//import source from './data.js';

//const data = source.data;

const getUrl = (url) => {
    console.log('getUrl.fetching:' + url);
    //return fetch(url)
    //.then(response => response.text())
    //.then(data => console.log('getUrl.results:' + data))
    //.catch(console.error);
    let xhr = new XMLHttpRequest();

    xhr.open('GET', url, false);

    try {
        xhr.send();
        if (xhr.status != 200) {
            console.log(`Error ${xhr.status}: ${xhr.statusText}`);
        } else {
            return xhr.response;
        }
    } catch(err) { // instead of onerror
        console.log("Request failed");
    }

}

const getXmlDoc = function(url) {
    let data = url ? getUrl(url) : `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>/</loc><lastmod>2021-08-17</lastmod></url>`;
    //console.log('getXmlDoc.data:' + data);
    if (!data) return;
    if (typeof window.DOMParser != "undefined") {
        //console.log('window.domparser');
        return ( new window.DOMParser() ).parseFromString(data, "application/xml");
    } else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
        //console.log('microsoft.xmldom');
        const xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(data);
        return xmlDoc;
    } else {
        console.log('getXmlDoc-no xml parser found');
        throw new Error('getXmlDoc-no xml parser found');
    }
}

const getData = function(url) {
    let xmlDoc = getXmlDoc(url);
    //console.log('getData.xmlDoc:' + xmlDoc);
    if (!xmlDoc) return;
    var results = {data:[]};
    var root = xmlDoc.getElementsByTagName('loc');
    for(var i=0; i < root.length; i++){
        let newNode = {"loc":root[i].textContent};
        results.data.push(newNode);
    }
    return results;
}

const urlParams = new URLSearchParams(window.location.search);
const url = urlParams.get('url');// ?? 'sitemap.xml'; //https://www.sitemaps.org
const data = getData(url);
console.log('data:' + data);
const width = 1440;

const processData = (data) => {
    console.log('processData.data:' + data);
    if (!data || !data.data || !data.data[0]) return null;

    const base = data.data[0].loc;
    console.log('processData.base:' + base);
    const newData = {
        loc: base,
        children: [],
    };

    data.data.forEach(({ loc }) => {

        let path = loc;

        if (loc.indexOf(base) !== -1) {
			    path = loc.substring(base.length, loc.length);
        }

        if (path === '') {
            return;
        }

        if (path.indexOf('/') === -1) {
            if (!newData.children.find(child => child === path)) {
            	newData.children.push({loc: path, children: []});
            };
        } else {
    		    const parent = path.substring(0, path.indexOf('/'));

            let parentObj = newData.children.find((child) => child.loc === parent);

            if (!parentObj) {
                let quickParent = data.data.find(d => d.loc === base + parent);
                if (!quickParent) {
                    quickParent = {
                        loc: parent,
                    }
                } else {
                	quickParent.loc = quickParent.loc.substring(base.length, quickParent.loc.length)
                }
                const parentObjIndex = newData.children.push(quickParent);
                parentObj = newData.children[parentObjIndex-1];
            }

            path = path.substring(path.indexOf('/') + 1, path.length);

            if (parentObj.children) {
                parentObj.children.push({loc: path});
            } else {
                parentObj.children = [{loc: path}];
            }
        }
    });

    return newData;
};

const tree = (treeData) => {
    const root = d3.hierarchy(treeData);
    root.dx = 10;
    root.dy = width / (root.height + 1);
    return d3.tree().nodeSize([root.dx, root.dy])(root);
};

const chart = () => {
    if (!data) { return null; }
    const processedData = processData(data);    
    const root = tree(processedData);

    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, x1 - x0 + root.dx * 2]);

    const g = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);

    const link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));

    const node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("fill", d => d.children ? "#555" : "#999")
        .attr("r", 2.5);

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -6 : 6)
        .attr("text-anchor", d => d.children ? "end" : "start")
        //.append("a")
        //.attr("xlink:href", d => d.data.link)
        .text(d => d.data.loc)//.substring(d.data.loc.length - 1, 1) !== '/' ? d.data.loc : d.data.loc.substring(0, d.data.loc.length -1))
        //.on("click",function(d){
        //    if (d3.event.defaultPrevented) return;
        //    alert("clicked!"+d.value);
        //})
        .clone(true).lower()
        .attr("stroke", "white");

    return svg.node();
}

window.treeChart = chart;

        // Variables
        var socket = new WebSocket("ws://localhost:4000/echo");
        var parametersChart = null;
        var chartLabels = [];
        var chartData = [];
        let newChart;
        let chartType = 'bar';
        var currentlySelectedNode;

        const api_url = '/api'; // '/api' or 'http://localhost:4000/api' will work

        // Function Definitions
        function fetchData() {

            // Fetch json data
            // Use https://d059d46c-898c-4ad8-bd3d-ec8d4c5c870d.mock.pstmn.io/dv (to get data from postman)
            // Use 'http://localhost:4000/api' (to get data from local server)

            fetch(api_url)
                .then(function (response) {
                    return response.json();
                }).then(function (myJson) {

                    var nodes = myJson.nodes;
                    // console.log("Nodes: ", nodes);
                    var links = myJson.links;
                    // console.log("Links", links);

                    createGraph(nodes, links)

                });
        };

        function createGraph(nodes, links) {

            // Hide stats when data is directly pushed from server using websocket
            // document.getElementById("stats-row").style.display = "none";


            var width = window.innerWidth
            var height = window.innerHeight / 2
            var cWidth = document.getElementById('dag').offsetWidth;

            // console.log("Width is: ", cWidth);

            var svg = d3.select('#dag').append('svg')
            // svg.attr('width', '100%').attr('height', height)
            svg.attr('viewBox', '0 0 ' + cWidth + ' ' + height);

            // simulation setup with all forces
            var linkForce = d3
                .forceLink()
                .id(function (link) { return link.id })
            //.strength(function (link) { return link.strength })

            var simulation = d3
                .forceSimulation()
                .force('link', linkForce)
                .force('charge', d3.forceManyBody().strength(-4500))
                .force('center', d3.forceCenter(cWidth / 2, height / 2))

            var dragDrop = d3.drag().on('start', function (node) {
                node.fx = node.x
                node.fy = node.y
            }).on('drag', function (node) {
                simulation.alphaTarget(0.7).restart()
                node.fx = d3.event.x
                node.fy = d3.event.y
            }).on('end', function (node) {
                if (!d3.event.active) {
                    simulation.alphaTarget(0)
                }
                node.fx = null
                node.fy = null
            })


            function mouseover() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 16)
                //.style("fill", "lightsteelblue");
                // console.log("Node is:", this)
            }

            function mouseout() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 11)
            }


            var tooltip = d3.select("body")
                .append("div")
                .attr("class", "card")
                .style("position", "absolute")
                .style("z-index", "20")
                .style("visibility", "hidden")
                .text("No Information Available!");

            svg = d3.select("svg")
            svg.append("svg:defs").append("svg:marker")
                .attr("id", "arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr('refX', -50)//so that it comes towards the center.
                .attr("markerWidth", 5)
                .attr("markerHeight", 5)
                .attr("orient", "auto")
                .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");

            var linkElements = svg.selectAll("line.link")
                .data(links)
                .enter().append("path")//append path
                .attr("class", "link")
                .style("stroke", "#000")
                .attr('marker-start', (d) => "url(#arrow)")//attach the arrow from defs
                .style("stroke-width", 2);

            var nodeElements = svg.append("g")
                .attr("class", "nodes")
                .selectAll("circle")
                .data(nodes)
                .enter().append("circle")
                .attr("r", 11)
                .attr("fill", getNodeColor)
                .attr("stroke", "black")
                .call(dragDrop)
                .on('click', selectNode)
                .on("mouseover", mouseover)
                .on("mouseout", mouseout);

            /* Display Tooltip
      
            .on("mouseover", function(node){
              tooltip.text(JSON.stringify(node.parameters));
              console.log("Mouse over:", node.parameters);
              return tooltip.style("visibility", "visible");
      
            })
            .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
            .on("mouseout", function(){return tooltip.style("visibility", "hidden");});
            
            */


            var textElements = svg.append("g")
                .attr("class", "texts")
                .selectAll("text")
                .data(nodes)
                .enter().append("text")
                .text(function (node) { return node.label })
                .attr("font-size", 15)
                .attr("dx", 15)
                .attr("dy", 4)

            simulation.nodes(nodes).on('tick', () => {
                nodeElements
                    .attr('cx', function (node) { return node.x })
                    .attr('cy', function (node) { return node.y })
                textElements
                    .attr('x', function (node) { return node.x })
                    .attr('y', function (node) { return node.y })
                linkElements
                    .attr("d", (d) => "M" + d.source.x + "," + d.source.y + ", " + d.target.x + "," + d.target.y)
            })

            simulation.force("link").links(links)
        }

        function getNodeColor(node) {
            return node.level === 2 ? 'OrangeRed' : 'SpringGreen'
        }

        function selectNode(selectedNode) {

            // document.getElementById("stats-row").style.display = "none"; // block | none
            document.getElementById("param-cards-row").style.display = "block"; // block | none
            document.getElementById("big-chart-row").style.display = "none"; // block | none


            currentlySelectedNode = selectedNode
            // On node selection we are making chartData empty
            chartLabels = []
            chartData = []

            var parametersObj = selectedNode.parameters;
            var allowedCharts = selectedNode.supportedCharts;

            // console.log("selected Node:", selectedNode)

            const values = Object.values(parametersObj)

            values.forEach(function (arrayItem) {
                var name = arrayItem.name;
                var initialValue = arrayItem.initialValue;
                chartLabels.push(name);
                chartData.push(initialValue);
                // console.log(name);
                // console.log(initialValue);
            });



            createParametersCards(parametersObj);
            displayMoreChartsButton(allowedCharts);

        }

        function createParametersCards(paramObj) {

            let cardBody = document.getElementById("param-cards-columns");
            while (cardBody.firstChild) {
                cardBody.removeChild(cardBody.firstChild);
                paramChartsArray = [];
            }

            // const values = Object.values(paramObj)

            // values.forEach(function (arrayItem) {
            //     var name = arrayItem.name;
            //     var initialValue = arrayItem.initialValue;

            //     let outerDiv = cardBody.appendChild(document.createElement('div'));
            //     outerDiv.setAttribute("class", "card text-right shadow-sm bg-white rounded");

            //     let headerDiv = outerDiv.appendChild(document.createElement('div'));
            //     headerDiv.setAttribute("class", "card-header");

            //     let input = headerDiv.appendChild(document.createElement('input'));
            //     input.setAttribute("class", "checkbox-cards form-check-input");
            //     input.setAttribute("type", "checkbox");
            //     input.setAttribute("id", name);
            //     input.setAttribute("name", name);
            //     input.setAttribute("value", initialValue);

            //     let checkBoxLabel = headerDiv.appendChild(document.createElement('label'));
            //     checkBoxLabel.setAttribute("class", "form-check-label text-primary text-uppercase");
            //     checkBoxLabel.setAttribute("for", name);
            //     checkBoxLabel.innerHTML = name;


            //     let innerDiv = outerDiv.appendChild(document.createElement('div'));
            //     innerDiv.setAttribute("class", "card-body");

            //     // let h5 = innerDiv.appendChild(document.createElement('h5'));
            //     // h5.setAttribute("class", "card-title text-xs font-weight-normal text-primary text-uppercase mb-1");
            //    // h5.innerHTML = name;

            //     let p = innerDiv.appendChild(document.createElement('p'));
            //     p.setAttribute("class", "card-text h4 mb-0 font-weight-bold text-gray-800");
            //     p.innerHTML = initialValue


            //     let chartDiv = innerDiv.appendChild(document.createElement('div'));
            //     let chartCanvas = chartDiv.appendChild(document.createElement('canvas'));
            //     chartCanvas.setAttribute("id", "cardLineChart");

            //     new Chart(document.getElementById("cardLineChart"),{"type":"line","data":{"labels":["January","February","March","April","May","June","July"],"datasets":[{"label":"My First Dataset","data":[65,59,80,81,56,55,40],"fill":false,"borderColor":"rgb(75, 192, 192)","lineTension":0.1}]},"options":{}});

            // });

           
            Object.keys(paramObj).forEach(function (key) {

                // console.log(key, paramObj[key].name);
                var paramName = paramObj[key].name;
                var initialValue = paramObj[key].initialValue;
                var visualization = paramObj[key].visualization;

                let cardDiv = cardBody.appendChild(document.createElement('div'));
                cardDiv.setAttribute("class", "card text-right shadow-sm bg-white rounded");

                let cardHeaderElement = cardDiv.appendChild(document.createElement('h5'));
                cardHeaderElement.setAttribute("class", "card-header text-primary");
                cardHeaderElement.innerText = paramName;

                /*
                let checkboxInput = cardHeaderElement.appendChild(document.createElement('input'));
                checkboxInput.setAttribute("class", "checkbox-cards form-check-input");
                checkboxInput.setAttribute("type", "checkbox");
                checkboxInput.setAttribute("id", paramName);
                checkboxInput.setAttribute("name", paramName);
                checkboxInput.setAttribute("value", initialValue);

                let checkBoxLabel = cardHeaderElement.appendChild(document.createElement('label'));
                checkBoxLabel.setAttribute("class", "form-check-label text-primary text-uppercase");
                checkBoxLabel.setAttribute("for", paramName);
                checkBoxLabel.innerHTML = paramName;
                */


                let cardBodyDiv = cardDiv.appendChild(document.createElement('div'));
                cardBodyDiv.setAttribute("class", "card-body");

                let p = cardBodyDiv.appendChild(document.createElement('p'));
                p.setAttribute("class", "card-text h1 mb-0 font-weight-bold text-gray-800");
                p.setAttribute("id", key + "_"); // Assigning unique id to p element
                p.innerHTML = initialValue;

                let breakElement = cardBodyDiv.appendChild(document.createElement('br'));


                let chartDiv = cardBodyDiv.appendChild(document.createElement('div'));
                chartDiv.setAttribute("id", key);
                
                
                function getData() {
                    return parseFloat(initialValue); 
                }

                function getTempData() {
                    return Math.random(); 
                }


                switch (visualization) {
                    case 'progressBar':
                    let progressDiv = chartDiv.appendChild(document.createElement('div')); 
                    progressDiv.setAttribute("class","progress");
                    let progressBarDiv = progressDiv.appendChild(document.createElement('div')); 
                    progressBarDiv.setAttribute("class","progress-bar");
                    progressBarDiv.setAttribute("role","progressbar");
                    progressBarDiv.setAttribute("style","width:"+initialValue+"%;");
                    progressBarDiv.setAttribute("aria-valuenow",initialValue);
                    progressBarDiv.setAttribute("aria-valuemin","0");
                    progressBarDiv.setAttribute("aria-valuemax","100");
                    progressBarDiv.innerText = initialValue + "%";
                      break;

                    default:
                        var layout = {
                            showlegend: false,
                            autosize: true,
                            // paper_bgcolor: '#7f7f7f',
                            // plot_bgcolor: '#c7c7c7',
                            margin: {
                                l: 60,
                                r: 50,
                                b: 40,
                                t: 10,
                                pad: 4
                              },
                             height: 250,
                            xaxis: {
                                autorange: true,
                                showgrid: false,
                                zeroline: false,
                                showline: false,
                                autotick: true,
                                ticks: '',
                                showticklabels: false
                              },
                              yaxis: {
                                autorange: true,
                                showgrid: false,
                                zeroline: false,
                                showline: false,
                                autotick: true,
                                ticks: '',
                                showticklabels: false
                              }
        
                        };

                        
                        
        
                        Plotly.plot(key, [{
                            y: [getData()],
                            mode: 'lines', //type: 'line' mode: 'lines+markers' mode: 'lines'
                            // fill: "tonexty",
                            line: {color: '#80CAF6'}
        
                        }], layout, {displayModeBar: false, responsive: true});
                        
        
                        // var cnt = 0;
                        // setInterval(function () {
                        //     Plotly.extendTraces(key, { y: [[getTempData()]] }, [0]);
                        //     cnt++;
                        //     if (cnt > 10) {
                        //         Plotly.relayout(key, {
                        //             xaxis: {
                        //                 range: [cnt - 10, cnt],
                        //                 showgrid: false,
                        //                 zeroline: false,
                        //                 showline: false,
                        //                 autotick: true,
                        //                 ticks: '',
                        //                 showticklabels: false

                        //             }
                        //         });
                        //     }
                        // }, 500);
                  }

                  chartDiv.style.display = "none";

            });

        }

        var currentChartType;
        var newBigChartArray = [];
        var newBigChart = null;

        function displayMoreChartsButton(supportedCharts) {
            // console.log("Supported charts: ", supportedCharts);

            if (supportedCharts.length != 0) {
                document.getElementById("more-charts-button").style.display = "block";
                addMenuOptions(supportedCharts);
            } else {
                document.getElementById("more-charts-button").style.display = "none";
            }
        }

        function addMenuOptions(chartList) {

            currentChartType = chartList[0];

            let menu = document.getElementById("more-charts-button-items");
            while (menu.firstChild) {
                menu.removeChild(menu.firstChild);
            }

            chartList.forEach(function (chartType) {

                let anchorElement = menu.appendChild(document.createElement('a'));
                anchorElement.setAttribute("class", "dropdown-item");
                anchorElement.setAttribute("onclick", "drawSelectedChart('" + chartType + "')");
                anchorElement.innerHTML = chartType + " chart";
            });
        }

        // Called with Generate Chart button tapped
        function generateChart() {

            newBigChartArray = []
            var checkboxes = document.getElementsByClassName("checkbox-cards")
            // console.log("Selected Checkboxes:", checkboxes)

            var numberOfCheckedItems = 0;
            for (var i = 0; i < checkboxes.length; i++) {
                if (checkboxes[i].checked) {
                    var tempObj = {};
                    tempObj[checkboxes[i].name] = checkboxes[i].value;

                    newBigChartArray.push(tempObj)
                    // console.log("New BigChart Object:", tempObj)
                    numberOfCheckedItems++;
                }
            }

            if (numberOfCheckedItems == 0) {
                document.getElementById("big-chart-row").style.display = "none"; // block | none
                alert("Select atleast one checkbox!");
            } else {
                // console.log("New BigChart Array values:", newBigChartArray)
                createNewBigChart(newBigChartArray, currentChartType)
                document.getElementById("big-chart-row").style.display = "block"; // block | none
            }

        }

        function createNewBigChart(newchartArray, chartType) {
            var keyArray = []
            var valueArray = []

            newchartArray.forEach(function (item, index) {

                Object.keys(item)
                    .forEach(function eachKey(key) {
                        keyArray.push(key)
                        valueArray.push(item[key])
                    });

            });

            switch (chartType) {
                case "bar":
                    createBarChart(keyArray, valueArray);
                    break;

                case "line":
                    createLineChart(keyArray, valueArray);
                    break;

                case "pie":
                    createPieChart(keyArray, valueArray);
                    break;

                default:
                    console.log("Please create a some chart!");
            }

            // To display the user seelcted chart type n new card selection
            currentChartType = chartType;
        }

        function drawSelectedChart(cType) {
            createNewBigChart(newBigChartArray, cType);
        }

        function createBarChart(keyArray, valueArray) {

            if (newBigChart != null) {
                newBigChart.destroy();
            }

            // if(newBigChart == null) {
            newBigChart = new Chart(document.getElementById("chartjs-1"),
                {
                    "type": "bar",
                    "data": {
                        "labels": keyArray,
                        "datasets": [{
                            "label": "My First Dataset",
                            "data": valueArray,
                            "fill": false,
                            "backgroundColor": ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
                            "borderColor": ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
                            "borderWidth": 1
                        }]
                    },
                    "options": {
                        "scales": {
                            "yAxes": [{
                                "ticks": { "beginAtZero": true }
                            }]
                        }
                    }
                });
            // }
            // else {
            //     var data = newBigChart.config.data;
            //     data.datasets[0].data = valueArray;
            //     data.labels = keyArray;
            //     newBigChart.update();
            // }
        }

        function createLineChart(keyArray, valueArray) {
            if (newBigChart != null) {
                newBigChart.destroy();
            }
            newBigChart = new Chart(document.getElementById("chartjs-1"),
                {
                    "type": "line",
                    "data": {
                        "labels": keyArray,
                        "datasets": [{
                            "label": "My First Dataset",
                            "data": valueArray,
                            "fill": false,
                            "borderColor": "rgb(75, 192, 192)",
                            "lineTension": 0.1
                        }]
                    },
                    "options": {
                        "scales": {
                            "yAxes": [{ "ticks": { "beginAtZero": true } }]
                        }
                    }
                });
        }

        function createPieChart(keyArray, valueArray) {
            if (newBigChart != null) {
                newBigChart.destroy();
            }

            newBigChart = new Chart(document.getElementById("chartjs-1"),
                {
                    "type": "pie",
                    "data": {
                        "labels": keyArray,
                        "datasets": [{
                            "label": "My First Dataset",
                            "data": valueArray,
                            "backgroundColor": ["rgb(255, 99, 132)", "rgb(54, 162, 235)", "rgb(255, 205, 86)"]
                        }]
                    }
                });
        }


        // Calling functions
        fetchData();

        // Socket delegate methods
        socket.onopen = function () {
            socket.send("Connection created!!!");
        };

        socket.onmessage = function (e) {
            //d3.select("#dag").select("svg").remove();
            // fetchData();
            reloadCards();
            // console.log("Received data through socket:", e.data)
        };

        async function reloadCards() {

            const response = await fetch(api_url);
            const data = await response.json();
            const { nodes, links } = data;
            // console.log("\nNodes:", nodes);


            d3.select("#dag").select("svg").remove();
            createGraph(nodes, links);

            nodes.forEach(function (node) {
                if (currentlySelectedNode != null) {

                    if (node.id == currentlySelectedNode.id) {
                        // console.log("Selected Node is", node.id)

                        Object.keys(node.parameters).forEach(function (key) {
                            // console.log("Parameter Key is:", key);

                            function getData() {
                                return parseFloat(node.parameters[key].initialValue);
                            }

                            var visualization = node.parameters[key].visualization;

                            var chartDiv = document.getElementById(key);
                            chartDiv.style.display = "block";

                            var p = document.getElementById(key + '_');
                            p.innerHTML = getData();
                            
                            switch (visualization) {
                                case 'progressBar':
                                        $("#"+key)
                                        .children()
                                        .children()
                                        .css("width", getData() + "%")
                                        .attr("aria-valuenow", getData())
                                        .text(getData() + "%");

                                default:
                                    // Update Chart
                                    function rand() {
                                        return Math.random();
                                        }

                                    
                                    var cnt = 0;
                                    //The setInterval() calls a function at specified intervals (500 milliseconds).
                                    // setInterval(function () {
                                        Plotly.extendTraces(key, {
                                            y: [[getData()]]
                                            }, [0]);
                                        // Plotly.extendTraces(key, { y: [[getData()]] }, [0]);
                                        cnt++;
                                        if (cnt > 10) {
                                            Plotly.relayout(key, {
                                                xaxis: {
                                                    range: [cnt - 10, cnt]
                                                }
                                            });
                                        }
                                    // }, 500);

                            }

                            
                            
                        });

                    }
                }
                else {
                    // Here we can reload whole page
                    console.log("No node is selected");
                }

            });

        }

        



    //window.setTimeout(chart);
   // window.addEventListener("resize", fetchData);
import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';

function SimpleNodeGraph() {
  const graphRef = useRef(null);
  var [data, setData] = useState(null);
  var latestData = useRef(null); // Create a mutable ref for latest data


  useEffect(() => {
    let initialized = false; 
    let currentNodeCount = 1;
    let currentLinkCount = 1;


    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:8000/data?node=' + currentNodeCount + '&link=' + currentLinkCount);
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            const data = await response.json();
            latestData.current = data; // Update the ref with the latest data

            if (!initialized) { // Check if graphData is not initialized
                setData(data);
                initialized = true; // Set initialized to true
                currentNodeCount = data.nodes.length + 1;
                currentLinkCount = data.links.length + 1;
            } else {
                currentNodeCount = currentNodeCount + data.nodes.length;
                currentLinkCount = currentLinkCount + data.links.length;
            }
            
        } catch (error) {
            console.error('Error fetching data:', error.message);
        }
    };

    fetchData(); // Initial fetch

    const interval = setInterval(fetchData, 3000); // Fetch data every 3 seconds

    return () => {
        clearInterval(interval); // Cleanup interval
    };
}, []);

  useEffect(() => {
    if (data) {

      const Graph = ForceGraph3D()(graphRef.current)
        .nodeAutoColorBy('group')
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)
        .nodeThreeObjectExtend(true)
        .nodeThreeObject(node => {
          const sprite = new SpriteText(node.label);
          sprite.material.depthWrite = false; // make sprite background transparent
          sprite.color = node.color;
          sprite.textHeight = 8;
          sprite.position.y = -10;
          return sprite;
        })
        .linkThreeObjectExtend(true)
        .linkThreeObject(link => {
          // extend link with text sprite
          const sprite = new SpriteText(`${link.source} > ${link.target}`);
          sprite.color = 'lightgrey';
          sprite.textHeight = 5;
          return sprite;
        })
        .linkPositionUpdate((sprite, { start, end }) => {
          const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
            [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
          })));

          // Position sprite
          Object.assign(sprite.position, middlePos);
        });

      Graph.d3Force('charge').strength(-30);
      Graph.d3Force('link').distance(80);
      Graph.graphData(data);

      let updateData = { ...data };

      setInterval(() => {
        
        if (latestData.current.nodes.length !== 0 || latestData.current.links.length !== 0) {
            const updatedNodes = latestData.current.nodes.map(node => ({
                id: node.id,
                label: node.label
            }));
            const openUpdatedLinks = latestData.current.links
            .filter(link => link.conn === 'open')
            .map(link => ({
                id: link.id,
                source: link.source,
                target: link.target,
            }));

        const closeUpdatedLinks = latestData.current.links
            .filter(link => link.conn === 'close')
            .map(link => ({
                id: link.id,
                source: link.source,
                target: link.target,
            }));

            Graph.graphData({
                nodes: [...updateData.nodes, ...updatedNodes],
                links: [...updateData.links, ...openUpdatedLinks]
            });
            
            closeUpdatedLinks.forEach(link => {
                const newFiltered = Graph.graphData().links.filter(l => l.source.id !== link.source || l.target.id !== link.target);
                console.log(newFiltered);
                Graph.graphData({
                    nodes: Graph.graphData().nodes,
                    links: newFiltered
                });
            });
                
            updateData = {
                nodes: Graph.graphData().nodes,
                links: Graph.graphData().links
            };
        }

        console.log(Graph.graphData().links);

        // console.log("date")
        // console.log(updateData)
    }, 3000);

    //   Optional: You can now use the removeNode function here or elsewhere in your component
      function removeNode(nodeId) {
        let { nodes, links } = Graph.graphData();
        links = links.filter(l => l.source.id !== nodeId && l.target.id !== nodeId);
        console.log(links); // Remove links attached to node
        nodes = nodes.filter(n => n.id !== nodeId); // Remove node
        Graph.graphData({ nodes, links });
      }
    }
  }, [data]);

  return <div ref={graphRef} style={{ width: '100%', height: '100vh' }} />;
}

export default SimpleNodeGraph;

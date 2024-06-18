import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import Panzoom from '@panzoom/panzoom';
import '../App.css';

const ArenaViewer = ({ arena }) => {
  const containerRef = useRef(null);
  const panzoomRef = useRef(null);

  const getStyleForEdge = (weight) => {
    if (weight === 'LHS') {
      return 'stroke: magenta;';
    } else if (weight === 'RHS') {
      return 'stroke: green;';
    } else if (weight === 'ARENA') {
      return 'stroke: red;';
    } else if (weight === 'VAR') {
      return 'stroke: orange;';
    }
    return '';
  };

  function getEdgePathIndex(linkStart, linkEnd, linkWeight) {
    console.log('finding edge path index for', linkStart, linkEnd, linkWeight);
    const pathParents = document.querySelectorAll(`#arena .edgePath > path`);
    const labelParents = document.querySelectorAll(`#arena .edgePath > g`);
    let index = 0;
    for (const pathParent of pathParents) {
      // console.log("checking pathParent", pathParent, pathParent.classList);
      // console.log("check is", pathParent.classList.contains(`${linkStart}`), pathParent.classList.contains(`${linkEnd}`));
      if (
        pathParent.classList.contains(`${linkStart}`) &&
        pathParent.classList.contains(`${linkEnd}`)
      ) {
        // now check if the labelParent has the correct weight
        const spanElement = labelParents[index].querySelector(
          'foreignObject > div > span'
        );
        const spanText = spanElement ? spanElement.innerText : '';
        console.log('checking labelParent', labelParents[index], spanText);
        console.log(
          'check is',
          spanText === linkWeight || (!linkWeight && spanText === '')
        );
        if (spanText === linkWeight || (!linkWeight && spanText === '')) {
          // either the text matches or both the text and weight are empty
          console.log(
            'FOUND edge path index for',
            linkStart,
            linkEnd,
            linkWeight,
            'at',
            index
          );
          return index;
        }
      }
      index++;
    }
    return -1;
  }

  const highlightNodesArena = (
    elements,
    lineages,
    allNodes,
    edges_start_end_weight,
    highlight_links = true
  ) => {
    // Create a map to store the full node identification
    const nodeIdMap = new Map();
    allNodes.forEach((node) => {
      const fullId = node.id;
      const uniqueId = fullId.split('-')[1];
      nodeIdMap.set(uniqueId, fullId);
    });

    // If elements is null, make all nodes gray and exit
    if (!elements) {
      allNodes.forEach((node) => {
        node.setAttribute('style', 'filter: grayscale(100%) brightness(0%)');
      });
      return;
    }

    // Ensure elements is an array
    if (!Array.isArray(elements)) {
      elements = [elements];
    }

    // Apply the filter to all nodes initially
    allNodes.forEach((node) => {
      // applyRandomStyle(node);
      node.setAttribute('style', 'filter: grayscale(100%) brightness(0%)');
    });

    const downstreamNodes = new Set();
    const upstreamNodes = new Set();
    const includedEdgeIndexes = new Set();

    const nodeConnections = new Map();
    edges_start_end_weight.forEach(([linkStart, linkEnd, weight]) => {
      const start_node = linkStart.split('-')[1];
      const end_node = linkEnd.split('-')[1];
      if (!nodeConnections.has(start_node)) {
        nodeConnections.set(start_node, {
          downstream: new Set(),
          upstream: new Set(),
        });
      }
      if (!nodeConnections.has(end_node)) {
        nodeConnections.set(end_node, {
          downstream: new Set(),
          upstream: new Set(),
        });
      }
      nodeConnections
        .get(start_node)
        .downstream.add({ node: end_node, weight });
      nodeConnections.get(end_node).upstream.add({ node: start_node, weight });
    });

    const findConnectedNodes = (
      node,
      visited = new Set(),
      direction = 'downstream'
    ) => {
      if (visited.has(node)) return;
      visited.add(node);
      const connectedNodes = nodeConnections.get(node)
        ? nodeConnections.get(node)[direction]
        : new Set();
      connectedNodes.forEach(({ node: connectedNode, weight }) => {
        if (direction === 'downstream') {
          downstreamNodes.add(connectedNode);
        } else {
          upstreamNodes.add(connectedNode);
        }
        const edgeIndex =
          direction === 'downstream'
            ? getEdgePathIndex(`LS-${node}`, `LE-${connectedNode}`, weight)
            : getEdgePathIndex(`LS-${connectedNode}`, `LE-${node}`, weight);
        if (edgeIndex !== -1) {
          includedEdgeIndexes.add(edgeIndex);
        }
        findConnectedNodes(connectedNode, visited, direction);
      });
    };

    elements.forEach((el) => {
      const nodeId = el.id.split('-')[1];
      if (highlight_links) {
        findConnectedNodes(nodeId, new Set(), 'downstream');
        findConnectedNodes(nodeId, new Set(), 'upstream');
        downstreamNodes.add(nodeId);
      } else {
        downstreamNodes.add(nodeId);
      }
    });

    downstreamNodes.forEach((nodeId) => {
      const fullNodeId = nodeIdMap.get(nodeId);
      const node = document.getElementById(fullNodeId);
      if (node) {
        node.setAttribute('style', 'filter:brightness(100%);');
      }
    });

    upstreamNodes.forEach((nodeId) => {
      const fullNodeId = nodeIdMap.get(nodeId);
      const node = document.getElementById(fullNodeId);
      if (node) {
        node.setAttribute('style', 'filter: sepia(100%);');
      }
    });
    // Style all edges that are NOT in the includedEdgeIndexes set
    document
      .querySelectorAll('#arena .edgePath > path')
      .forEach((path, index) => {
        if (!includedEdgeIndexes.has(index)) {
          path.classList.add('arena-edge-excluded');
        }
      });
    document
      .querySelectorAll('#arena .edgePath > g')
      .forEach((label, index) => {
        if (!includedEdgeIndexes.has(index)) {
          label.classList.add('arena-edge-excluded');
        }
      });
  };

  const renderMermaid = async () => {
    const container = containerRef.current;
    container.innerHTML = ''; // Clear previous content

    mermaid.initialize({
      maxTextSize: 1000000,
      maxEdges: 10000,
    });

    try {
      //   console.log(arena.arena);
      const { svg } = await mermaid.render('arena', arena.arena);
      const element = document.createElement('div');
      element.innerHTML = svg;
      element.className = 'arena-content';
      container.appendChild(element);

      // Clear previous Panzoom instance if it exists
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
        panzoomRef.current = null;
      }

      // Initialize panzoom
      panzoomRef.current = Panzoom(element, {
        maxScale: 200,
        step: 0.07,
      });
      element.parentElement.addEventListener(
        'wheel',
        panzoomRef.current.zoomWithWheel
      );

      let invisible_node = document.querySelectorAll(
        '#arena .node.INVIS > g > foreignObject > div > span'
      )[0];
      let invisible_node_text = invisible_node.innerText; // ie: 'LS-3_LE-1_LHS;LS-3_LE-2_RHS;LS-9_LE-8_LHS;LS-9_LE-4_RHS'

      const edges = invisible_node_text.split(';');

      // Create a list of the [linkStart, linkEnd, weight] splits
      const edges_start_end_weight = edges.map((edge) => edge.split('_'));

      // Iterate over each edge definition
      edges_start_end_weight.forEach(([linkStart, linkEnd, weight]) => {
        const paths = document.querySelectorAll(
          `#arena .edgePath > path.${linkStart}.${linkEnd}`
        );
        paths.forEach((path) => {
          const style = getStyleForEdge(weight);
          if (style) {
            path.setAttribute('style', style);
          }
        });
      });

      const allNodes = Array.from(
        document.querySelectorAll('#arena .node:not(.subgraph)')
      );
      const lineages = new Map();

      // Add event listeners
      allNodes.forEach(function (el) {
        el.addEventListener('mouseenter', (event) => {
          highlightNodesArena(
            el,
            lineages,
            allNodes,
            edges_start_end_weight,
            true
          );
        });

        el.addEventListener('mouseleave', (event) => {
          allNodes.map((node) => {
            node.removeAttribute('style');
          });

          // also remove arena-edge-excluded from all paths and labels
          document
            .querySelectorAll('#arena .edgePath > path')
            .forEach((path) => {
              path.classList.remove('arena-edge-excluded');
            });
          document.querySelectorAll('#arena .edgePath > g').forEach((label) => {
            label.classList.remove('arena-edge-excluded');
          });
        });
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (arena) {
      renderMermaid();
    }
  }, [arena]);

  return (
    <div
      ref={containerRef}
      className="arena-visualizer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    ></div>
  );
};

export default ArenaViewer;

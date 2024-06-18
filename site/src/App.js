import React, { useEffect, useState, useRef } from 'react';
import GraphViewer from './components/GraphViewer';
import HistoryControls from './components/HistoryControls';
import DiffViewer from './components/DiffViewer';
import SourceViewer from './components/SourceViewer';
import ArenaViewer from './components/ArenaViewer';
import './App.css';
import { Layout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import baseLayoutConfig from './components/BaseLayout';

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [graphs, setGraphs] = useState([]);
  const [sources, setSources] = useState([]);
  const [arena, setArena] = useState(null);
  const [watchLatest, setWatchLatest] = useState(true);
  const [fetchUpdates, setFetchUpdates] = useState(true);
  const [newGraph, setNewGraph] = useState('');
  const [locToHighlight, setLocToHighlight] = useState(null);
  const [forksToHighlight, setForksToHighlight] = useState([]);
  const layoutRef = useRef(null);
  const [model, setModel] = useState(Model.fromJson(baseLayoutConfig));
  const [diffHighlights, setDiffHighlights] = useState([]);
  const [sourceHoverPos, setSourceHoverPos] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const graph_response = await fetch('http://127.0.0.1:8545/getgraphs');
      const graph_json = await graph_response.json();
      const source_response = await fetch('http://127.0.0.1:8545/getsources');
      const source_json = await source_response.json();
      const arena_response = await fetch('http://127.0.0.1:8545/getarena');
      const arena_json = await arena_response.json();

      // Only update state if the fetched data is different
      if (JSON.stringify(graph_json) !== JSON.stringify(graphs)) {
        setGraphs(graph_json);
      }
      if (JSON.stringify(source_json) !== JSON.stringify(sources)) {
        setSources(source_json);
      }
      if (JSON.stringify(arena_json) !== JSON.stringify(arena)) {
        setArena(arena_json);
      }

      if (watchLatest && graph_json.length > 1) {
        setCurrentIndex(graph_json.length - 1);
      }
    };

    if (fetchUpdates) {
      fetchHistory();
      const intervalId = setInterval(fetchHistory, 1000); // Fetch new history every 1 second
      return () => clearInterval(intervalId); // Cleanup on component unmount
    }
  }, [fetchUpdates, watchLatest, graphs, sources, arena]);

  useEffect(() => {
    document.body.className = 'dark-mode'; // Set dark mode by default
  }, []);

  useEffect(() => {
    if (graphs.length > 0 && currentIndex > 0) {
      const updatedConfig = { ...model.toJson() };

      const updateGraphConfig = (node) => {
        if (node.type === 'tab' && node.component === 'GraphViewer') {
          node.config.graph = graphs[currentIndex]?.graph;
        } else if (node.type === 'tab' && node.component === 'DiffViewer') {
          node.config.graph1 = graphs[currentIndex - 1]?.graph;
          node.config.graph2 = graphs[currentIndex]?.graph;
        } else if (node.children) {
          node.children.forEach(updateGraphConfig);
        }
      };

      updatedConfig.layout.children.forEach(updateGraphConfig);
      setModel(Model.fromJson(updatedConfig));
    }
  }, [graphs, currentIndex]);

  useEffect(() => {
    if (sources.length > 0) {
      const updatedConfig = { ...model.toJson() };
      const sortedSources = [...sources].sort(
        (a, b) => a.file_number - b.file_number
      );
      const sourceTabs = sortedSources.map(({ file_number, path, source }) => ({
        type: 'tab',
        id: `source-${file_number}`,
        name: `Source ${file_number}`,
        component: 'SourceViewer',
        config: { sourceCode: source, file_number: file_number },
      }));
      updatedConfig.layout.children[0].children[0].children[2].children[0].children =
        sourceTabs;

      setModel(Model.fromJson(updatedConfig));
    }
  }, [sources]);

  useEffect(() => {
    if (locToHighlight) {
      const updatedConfig = { ...model.toJson() };
      let { file_number } = locToHighlight;
      file_number = Number(file_number);

      const updateTabsetSelection = (node) => {
        if (node.type === 'tabset') {
          const tabIndex = node.children.findIndex(
            (child) =>
              child.type === 'tab' &&
              child.component === 'SourceViewer' &&
              child.config.file_number === file_number
          );
          if (tabIndex !== -1) {
            node.selected = tabIndex;
          }
        } else if (node.children) {
          node.children.forEach(updateTabsetSelection);
        }
      };

      updatedConfig.layout.children.forEach(updateTabsetSelection);
      setModel(Model.fromJson(updatedConfig));
    }
  }, [locToHighlight]);

  const factory = (node) => {
    const component = node.getComponent();
    const config = node.getConfig();
    if (component === 'GraphViewer') {
      return (
        <GraphViewer
          graph={config.graph}
          onNodeHighlight={handleNodeHighlight}
          diffHighlights={diffHighlights}
          sourceHoverPos={sourceHoverPos}
        />
      );
    } else if (component === 'DiffViewer') {
      return (
        <DiffViewer
          graph1={config.graph1}
          graph2={config.graph2}
          onNewGraph={handleNewGraph}
          onDiffHighlights={handleDiffHighlights}
        />
      );
    } else if (component === 'HistoryControls') {
      return (
        <HistoryControls
          currentIndex={currentIndex}
          setCurrentIndex={handleSetCurrentIndex}
          maxIndex={graphs.length - 1}
          clearHistory={clearHistory}
          toggleWatchLatest={toggleWatchLatest}
          watchLatest={watchLatest}
          fetchUpdates={fetchUpdates}
          setFetchUpdates={setFetchUpdates}
        />
      );
    } else if (component === 'SourceViewer') {
      const loc =
        locToHighlight &&
        Number(locToHighlight.file_number) === Number(config.file_number)
          ? locToHighlight
          : null;
      const filteredForksToHighlight = forksToHighlight.filter(
        (fork) => Number(fork.file_number) === Number(config.file_number)
      );
      return (
        <SourceViewer
          sourceCode={config.sourceCode}
          fileNumber={config.file_number}
          locToHighlight={loc}
          forksToHighlight={filteredForksToHighlight}
          onHover={handleHover}
        />
      );
    } else if (component === 'ArenaViewer') {
      return <ArenaViewer arena={arena} />;
    }
  };

  const handleSetCurrentIndex = (index) => {
    setCurrentIndex(index);
    setWatchLatest(false); // Disable watch updates mode when manually setting index
  };

  const clearHistory = async () => {
    await fetch('http://127.0.0.1:8545/clear', { method: 'POST' });
    setGraphs([]); // Clear the local state
    setCurrentIndex(0); // Reset the current index
  };

  const toggleWatchLatest = () => {
    setWatchLatest(!watchLatest);
  };

  const handleNewGraph = (newGraphString) => {
    setNewGraph(newGraphString);
  };

  const handleNodeHighlight = (loc, forks) => {
    setLocToHighlight(loc || null);
    setForksToHighlight(forks || []);
  };

  const handleDiffHighlights = (diffHighlights) => {
    setDiffHighlights(diffHighlights);
  };

  const handleHover = (file_number, pos) => {
    setSourceHoverPos({ file_number: file_number, pos: pos });
  };

  return (
    <div className="App">
      <button onClick={toggleWatchLatest}>
        {watchLatest ? 'Stop Watching Updates' : 'Watch Updates'}
      </button>
      {graphs.length > 1 && (
        <>
          <div ref={layoutRef} className="flexlayout-container">
            {model && (
              <Layout model={model} factory={factory} realtimeResize={true} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;

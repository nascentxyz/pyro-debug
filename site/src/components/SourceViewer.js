import { StateField } from '@codemirror/state';
import { Decoration, EditorView, hoverTooltip } from '@codemirror/view';
import React, { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { solidity } from '@replit/codemirror-lang-solidity';
import '../App.css';
import { oneDark } from '@codemirror/theme-one-dark';
import { RangeSetBuilder } from '@codemirror/state';
import { useMemo } from 'react';

const SourceViewer = ({
  sourceCode,
  fileNumber,
  locToHighlight,
  forksToHighlight,
  onHover,
}) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const fileNumberRef = useRef(null);

  // Memoize locToHighlight and forksToHighlight to avoid unnecessary re-renders
  const memoizedLocToHighlight = useMemo(() => locToHighlight, [locToHighlight]);
  const memoizedForksToHighlight = useMemo(() => forksToHighlight, [forksToHighlight]);

  useEffect(() => {
    if (
      editorRef.current &&
      sourceCode !== null &&
      sourceCode !== undefined &&
      fileNumber !== null &&
      fileNumber !== undefined
    ) {
      // Save the file_number in the ref
      fileNumberRef.current = Number(fileNumber);

      let start = 0;
      let end = 0;
      if (memoizedLocToHighlight) {
        const { file_number: fn, start: s, end: e } = memoizedLocToHighlight;
        const parsedFileNumber = parseInt(fn, 10);
        const parsedStart = parseInt(s, 10);
        const parsedEnd = parseInt(e, 10);
        if (
          !isNaN(parsedFileNumber) &&
          !isNaN(parsedStart) &&
          !isNaN(parsedEnd)
        ) {
          start = parsedStart;
          end = parsedEnd;
        } else {
          console.error('Invalid locToHighlight values', memoizedLocToHighlight);
        }
      }

      const highlightDeco = Decoration.mark({
        class: 'loc-highlight',
      });

      const filteredForksToHighlight = memoizedForksToHighlight.filter(
        (fork) => Number(fork.file_number) === Number(fileNumber)
      );

      const forkDecos = filteredForksToHighlight
        .map((fork) => {
          const { file_number: fn, start: s, end: e, edge } = fork;
          const parsedFileNumber = parseInt(fn, 10);
          const parsedStart = parseInt(s, 10);
          const parsedEnd = parseInt(e, 10);
          if (
            isNaN(parsedFileNumber) ||
            isNaN(parsedStart) ||
            isNaN(parsedEnd)
          ) {
            console.error('Invalid fork values', fork);
            return null;
          }
          const className = edge
            ? 'fork-true-highlight'
            : 'fork-false-highlight';
          return {
            from: parsedStart,
            to: parsedEnd,
            deco: Decoration.mark({ class: className }),
          };
        })
        .filter((deco) => deco !== null);

      const highlightField = StateField.define({
        create() {
          const builder = new RangeSetBuilder();
          const ranges = [
            { from: start, to: end, deco: highlightDeco },
            ...forkDecos.map((deco) => ({
              from: deco.from,
              to: deco.to,
              deco: deco.deco,
            })),
          ];

          // Sort ranges by `from` position
          ranges.sort((a, b) => a.from - b.from);
          ranges.forEach(({ from, to, deco }) => builder.add(from, to, deco));
          return builder.finish();
        },
        update(deco, tr) {
          if (tr.docChanged) {
            const builder = new RangeSetBuilder();
            const ranges = [
              { from: start, to: end, deco: highlightDeco },
              ...forkDecos.map((deco) => ({
                from: deco.from,
                to: deco.to,
                deco: deco.deco,
              })),
            ];

            // Sort ranges by `from` position
            ranges.sort((a, b) => a.from - b.from);
            ranges.forEach(({ from, to, deco }) => builder.add(from, to, deco));
            return builder.finish();
          }
          return deco;
        },
        provide: (f) => EditorView.decorations.from(f),
      });

      const hoverExtension = hoverTooltip(
        (view, pos) => {
          // console.log("hovering, view: ", view, "pos: ", pos);
          onHover(fileNumberRef.current, pos);
          return null; // No tooltip display
        },
        { hoverTime: 50 }
      ); // hover activates after 50ms

      const state = EditorState.create({
        doc: sourceCode,
        extensions: [
          basicSetup,
          EditorView.editable.of(false), // Make the editor read-only
          solidity,
          oneDark,
          highlightField,
          hoverExtension,
        ],
      });

      // Create a new EditorView instance
      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      });

      // Scroll to the highlighted location
      if (start !== 0 || end !== 0) {
        viewRef.current.dispatch({
          effects: EditorView.scrollIntoView(start, { y: 'center' }),
        });
      }

      // Cleanup function to destroy the view when the component unmounts
      return () => {
        viewRef.current.destroy();
      };
    }
  }, [sourceCode, memoizedLocToHighlight, memoizedForksToHighlight]);

  return <div ref={editorRef} className="editor-container" />;
};

export default SourceViewer;
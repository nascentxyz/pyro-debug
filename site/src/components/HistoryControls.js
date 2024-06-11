import React, { useState, useEffect } from 'react';

const HistoryControls = ({ currentIndex, setCurrentIndex, maxIndex, clearHistory, toggleWatchUpdates, watchUpdates }) => {
    const [inputIndex, setInputIndex] = useState(currentIndex);

    const handlePrevClick = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNextClick = () => {
        if (currentIndex < maxIndex) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleFirstClick = () => {
        setCurrentIndex(0);
    };

    const handleLastClick = () => {
        setCurrentIndex(maxIndex);
    };

    const handleInputChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value <= maxIndex) {
            setInputIndex(value);
        }
    };

    const handleJumpClick = () => {
        setCurrentIndex(inputIndex);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                handlePrevClick();
            } else if (e.key === 'ArrowRight') {
                handleNextClick();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentIndex, maxIndex]);

    return (
        <div>
            <div>
                {currentIndex} / {maxIndex}
            </div>
            <button onClick={toggleWatchUpdates}>
                {watchUpdates ? 'Stop Watching Updates' : 'Watch Updates'}
            </button>
            <button onClick={handleFirstClick}>First</button>
            <button onClick={handlePrevClick}>Previous</button>
            <button onClick={handleNextClick}>Next</button>
            <button onClick={handleLastClick}>Last</button>
            <input
                type="number"
                value={inputIndex}
                onChange={handleInputChange}
                min="0"
                max={maxIndex}
            />
            <button onClick={handleJumpClick}>Jump</button>
            <button onClick={clearHistory}>Clear History</button>
        </div>
    );
};

export default HistoryControls;
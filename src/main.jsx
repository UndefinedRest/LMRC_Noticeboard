import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.render(<App />, rootElement);
} else {
  console.error('Root element not found! Make sure index.html has <div id="root"></div>');
}

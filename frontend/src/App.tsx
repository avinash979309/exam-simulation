import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Configuration from './pages/Configuration';
import Simulation from './pages/Simulation';
import Results from './pages/Results';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Configuration />} />
        <Route path="/simulation/:id" element={<Simulation />} />
        <Route path="/results/:id" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
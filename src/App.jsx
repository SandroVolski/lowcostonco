import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ServicoRelacionada from "./view/pages/ServicoRelacionada";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ServicoRelacionada />} />
      </Routes>
    </Router>
  );
}

export default App;

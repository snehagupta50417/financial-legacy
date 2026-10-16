import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StoreProvider } from './store'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StoreProvider>
      <App />
    </StoreProvider>
  </BrowserRouter>,
)

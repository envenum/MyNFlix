import { createContext, useContext } from 'react'

export const LibraryContext = createContext({
  shows: [],
  status: 'loading',
  updated: null,
  user: null,
  role: null,
  error: '',
  reload: () => {},
  login: () => {},
  logout: () => {},
})

export const useLibrary = () => useContext(LibraryContext)

import { createContext, useContext } from 'react'

export const LibraryContext = createContext({
  shows: [],
  status: 'loading',
  updated: null,
  reload: () => {},
  unlock: () => {},
})

export const useLibrary = () => useContext(LibraryContext)

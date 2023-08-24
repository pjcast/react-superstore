import { useState, useEffect } from 'react'
import shouldUpdate from './utils/shouldUpdate'
import isFn from './utils/isFn'

type Reducer<TStore, TAction> = (store: TStore, action: TAction) => TStore
type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;

type Listener = {
  mapState: (store: any) => any
  updater: React.Dispatch<React.SetStateAction<any>>
}

const createStore = <TStore, R extends Reducer<TStore, any>>(
  initialStore: TStore,
  reducer?: R
) => {
  let store: TStore = initialStore
  const listeners = new Set<Listener>()

  const getStore = () => store

  const dispatch = (action: TStore | ((prev: TStore) => TStore) | ReducerAction<R>) => {
    const oldStore = store

    if (reducer) {
      store = reducer(store, action)
    } else {
      // @ts-expect-error[2349]
      store = isFn(action) ? action(store) : action
    }

    listeners.forEach(({ mapState, updater }) => {
      const oldState = mapState(oldStore)
      const newState = mapState(store)
      if (shouldUpdate(oldState, newState)) updater(() => newState)
    })
  }

  const pickStore = <K extends keyof TStore>(mapState:((s: TStore) => Pick<TStore, K>) = (s) => s) => {
    const [, updater] = useState()

    useEffect(() => {
      const listener = {
        updater,
        mapState,
      }

      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }, [mapState])

    return mapState(store)
  }
  
  const useStore = (mapState:((s: TStore) => TStore) = (s) => s) => {
    const [, updater] = useState<TStore>()

    useEffect(() => {
      const listener = {
        updater,
        mapState,
      }

      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }, [mapState])

    return mapState(store)
  }

  return [useStore, dispatch, getStore, pickStore] as const
}

export default createStore

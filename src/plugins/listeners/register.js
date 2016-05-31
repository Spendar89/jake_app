import handlers from './handlers';

export default function register (dispatch, source) {
  for (let key in handlers) {
    // multiple source paths are separated by commas,
    // for registering single handler on multiple cursors
    const pathStrings = key.split(',');

    // register handler for each path
    for (let pathString of pathStrings) {
      // nested cursors are separated by periods,
      // so call split to ocnvert string to array
      const path = pathString.split('.');
      const _source = source.select(path);

      // if source exists at path, initiate a handler
      // that will dispatch an event for the current
      // handler-key and source-data
      _source && _source.on('update', ({ data: payload }) => {
        dispatch({
          key,
          payload
        });
      });
    };
  };
};

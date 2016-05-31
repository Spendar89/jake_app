import handlers from './handlers';

export default function register (dispatch, source) {
  for (let key in handlers) {
    source(key, ({ params: payload }) => {
      // get current parsed query string object
      //const qs = Util.getQueryString();
      //const payload = { ...params, ...qs };

      dispatch({
        key,
        payload
      });
    });
  };
};

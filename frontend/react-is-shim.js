/**
 * react-is-shim.js
 * Provides window.ReactIs symbols and type-check methods required by Recharts UMD bundle.
 */
(function() {
    if (typeof window !== "undefined") {
        var REACT_FORWARD_REF_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.forward_ref") : 0xead0;
        var REACT_MEMO_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.memo") : 0xead3;
        var REACT_ELEMENT_TYPE = typeof Symbol === "function" && Symbol.for ? (Symbol.for("react.transitional.element") || Symbol.for("react.element")) : 0xeac7;
        var REACT_FRAGMENT_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.fragment") : 0xeacb;
        var REACT_PORTAL_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.portal") : 0xeaca;
        var REACT_PROFILER_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.profiler") : 0xead2;
        var REACT_STRICT_MODE_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.strict_mode") : 0xeacc;
        var REACT_SUSPENSE_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.suspense") : 0xead1;
        var REACT_SUSPENSE_LIST_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.suspense_list") : 0xead8;
        var REACT_CONTEXT_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.context") : 0xeace;
        var REACT_CONSUMER_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.consumer") : 0xeacd;
        var REACT_LAZY_TYPE = typeof Symbol === "function" && Symbol.for ? Symbol.for("react.lazy") : 0xead4;

        window.ReactIs = {
            ForwardRef: REACT_FORWARD_REF_TYPE,
            Memo: REACT_MEMO_TYPE,
            Element: REACT_ELEMENT_TYPE,
            Fragment: REACT_FRAGMENT_TYPE,
            Portal: REACT_PORTAL_TYPE,
            Profiler: REACT_PROFILER_TYPE,
            StrictMode: REACT_STRICT_MODE_TYPE,
            Suspense: REACT_SUSPENSE_TYPE,
            SuspenseList: REACT_SUSPENSE_LIST_TYPE,
            ContextConsumer: REACT_CONSUMER_TYPE,
            ContextProvider: REACT_CONTEXT_TYPE,
            Lazy: REACT_LAZY_TYPE,
            isForwardRef: function(object) {
                return !!(object && (object.$$typeof === REACT_FORWARD_REF_TYPE || (object.type && object.type.$$typeof === REACT_FORWARD_REF_TYPE)));
            },
            isMemo: function(object) {
                return !!(object && (object.$$typeof === REACT_MEMO_TYPE || (object.type && object.type.$$typeof === REACT_MEMO_TYPE)));
            },
            isElement: function(object) {
                return typeof object === "object" && object !== null && (object.$$typeof === REACT_ELEMENT_TYPE || object.$$typeof === Symbol.for("react.element"));
            },
            isFragment: function(object) {
                return !!(object && object.$$typeof === REACT_FRAGMENT_TYPE);
            },
            isLazy: function(object) {
                return !!(object && object.$$typeof === REACT_LAZY_TYPE);
            },
            isValidElementType: function(type) {
                return typeof type === "string" || typeof type === "function" || (typeof type === "object" && type !== null);
            },
            typeOf: function(object) {
                if (typeof object === "object" && object !== null) {
                    return object.$$typeof;
                }
                return undefined;
            }
        };
    }
})();

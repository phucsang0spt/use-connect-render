import { useConnectRender } from 'use-connect-render'

#### Example 1:

```
function CompA() {
   const { push } =  useConnectRender('my-counter', { c: 0, started : false });

   return (
        <button onClick={()=> {
            push('c', prev => prev + 1);
            push('started', true)
        }}>
           Click me
        </button>
   );
}

function CompB() {
   const { listen } =  useConnectRender('my-counter', { c: 0, started : false });

   const [counter, started] = listen('c','started');
   return (
        <div>
          started : {started}
          my count: {counter}
        </div>
   );
}
```

#### Example 2:

```
function CompA() {
   const { push, getCurrent } =  useConnectRender('my-counter', { c: 0 });

   const count = useCallback(()=>{
       const curr = getCurrent('c')[0];
       push('c', curr + 1);
   },[push, getCurrent]);

   return (
        <button onClick={count}>
           Click me
        </button>
   );
}

function CompB() {
   const { listen } =  useConnectRender('my-counter', { c: 0 });

   const [counter] = listen('c');
   return (
        <div>
          my count: {counter}
        </div>
   );
}
```

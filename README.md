import { useConnectRender } from 'use-connect-render'

#### Example 1:

```
function CompA() {
   const { pusher } =  useConnectRender('my-counter', { c: 0, started : false });

   return (
        <button onClick={()=> {
            pusher('c', prev => prev + 1);
            pusher('started', true)
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
   const { pusher, getCurrent } =  useConnectRender('my-counter', { c: 0 });

   const count = useCallback(()=>{
       const curr = getCurrent('c')[0];
       pusher('c', curr + 1);
   },[pusher, getCurrent]);

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

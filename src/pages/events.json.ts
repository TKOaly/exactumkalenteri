import Calendar from "../cal";

export function GET({ params, request }) {

  return new Response(
    JSON.stringify(Calendar),
    {
      headers: new Headers({
        "Cache-Control": "max-age=3600"
      })
    }
  );
}
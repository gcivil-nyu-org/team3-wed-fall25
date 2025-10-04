from rest_framework.renderers import JSONRenderer

class OkJSONRenderer(JSONRenderer):
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response") if renderer_context else None

        if response is not None and getattr(response, "exception", False):
            return super().render(data, accepted_media_type, renderer_context)

        payload = data

        if isinstance(payload, dict) and "result" in payload:
            return super().render(payload, accepted_media_type, renderer_context)

        if isinstance(payload, dict) and {"count", "results"}.issubset(payload.keys()):
            payload = {
                "items": payload.get("results", []),
                "pagination": {
                    "count": payload.get("count", 0),
                    "next": payload.get("next"),
                    "previous": payload.get("previous"),
                },
            }

        wrapped = {
            "result": True,
            "data": payload,
        }
        return super().render(wrapped, accepted_media_type, renderer_context)
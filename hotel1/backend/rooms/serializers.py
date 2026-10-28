
from rest_framework import serializers

from .models import RoomType, Room, RoomImage


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = "__all__"
        read_only_fields = ("id", "room")


class RoomTypeSerializer(serializers.ModelSerializer):
    room_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = RoomType
        fields = "__all__"

    def validate_price_per_night(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Narx 0 dan katta bo‘lishi kerak."
            )
        return value

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Sig‘im kamida 1 bo‘lishi kerak."
            )
        return value


class RoomSerializer(serializers.ModelSerializer):
    room_type = RoomTypeSerializer(read_only=True)

    room_type_id = serializers.PrimaryKeyRelatedField(
        source="room_type",
        queryset=RoomType.objects.all(),
        write_only=True,
    )

    images = RoomImageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Room
        fields = "__all__"
        read_only_fields = (
            "status",
            "images",
        )

    def validate(self, attrs):
        room_type = attrs.get(
            "room_type",
            getattr(self.instance, "room_type", None),
        )

        if not room_type:
            raise serializers.ValidationError(
                {
                    "room_type_id": "Xona turi majburiy."
                }
            )

        return attrs

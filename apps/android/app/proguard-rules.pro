# Keep kotlinx.serialization generated serializers.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class **$$serializer { *; }
-keep,includedescriptorclasses class com.carwash.owner.**$$serializer { *; }
-keepclassmembers class com.carwash.owner.** {
    *** Companion;
}

-keep class com.getcapacitor.** { *; }
-keep class com.mian.omnichannel.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class kotlin.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keepattributes SourceFile,LineNumberTable

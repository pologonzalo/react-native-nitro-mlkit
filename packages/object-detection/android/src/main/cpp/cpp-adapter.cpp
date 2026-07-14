#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroMLKitObjectsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::mlkit::objects::registerAllNatives();
  });
}

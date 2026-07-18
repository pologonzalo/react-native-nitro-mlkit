#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroMLKitSubjectSegOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::mlkit::subjectseg::registerAllNatives();
  });
}
